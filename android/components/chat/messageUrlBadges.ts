export type MessageUrlBadgeKind = 'link' | 'reference' | 'tag' | 'overflow';

export interface MessageUrlBadge {
  id: string;
  kind: MessageUrlBadgeKind;
  label: string;
  hiddenBadges?: MessageUrlBadge[];
  omittedCount?: number;
  url?: string;
}

export interface MessageUrlBadgeParts {
  text: string;
  badges: MessageUrlBadge[];
}

const MESSAGE_URL_PATTERN = /https?:\/\/[^\s<>"'(){}|\\^`[\]]+/gi;
const TRAILING_URL_PUNCTUATION_PATTERN = /[.,!?;:]+$/;
const REFERENCE_SECTION_PATTERN =
  /(^|\n|[.!?]\s+)[ \t]*(?:sources?|references?|출처|참고)(?:[ \t]*[:：(][ \t]*|[ \t]+(?=https?:\/\/)|[ \t]*(?=\n|$))/gi;
const REFERENCE_ITEM_SEPARATOR_PATTERN = /\s*(?:[,，;；]|\n)\s*/;
const EMPTY_REFERENCE_ITEM_PATTERN =
  /^(?:[-*•\s()[\]{}.,!?;:："'`]|\.{2,}|…)+$/;
const MAX_VISIBLE_BADGES = 2;
const REFERENCE_TAG_BADGE: MessageUrlBadge = {
  id: 'reference-tag',
  kind: 'tag',
  label: '출처',
};

interface ReferenceSectionRange {
  start: number;
  bodyStart: number;
  end: number;
}

function stripTrailingUrlPunctuation(url: string) {
  return url.replace(TRAILING_URL_PUNCTUATION_PATTERN, '');
}

function compactMessageText(text: string) {
  return text
    .replace(/\[([^\]]+)\]\(\s*\)/g, '$1')
    .replace(/<\s*>/g, '')
    .replace(/\(\s*\)/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\s+([.,!?;:])/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function stripReferenceLabels(text: string) {
  return text
    .replace(
      /(^|\n)\s*(?:sources?|references?|출처|참고)\s*[:：]?\s*\.?\s*(?=\n|$)/gi,
      '$1',
    )
    .replace(
      /(?:^|[\n ])(?:sources?|references?|출처|참고)\s*[:：]?\s*\.?\s*$/i,
      '',
    )
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function cleanReferenceLabel(label: string) {
  const compactedLabel = compactMessageText(label)
    .replace(/^\s*(?:[-*•]\s*)+/, '')
    .replace(/^[\s()[\]{}.,!?;:："'`]+/, '')
    .replace(/[\s()[\]{}.,!?;:："'`]+$/g, '')
    .trim();

  return EMPTY_REFERENCE_ITEM_PATTERN.test(compactedLabel)
    ? ''
    : compactedLabel;
}

function formatBadgeLabel(url: string) {
  const withoutProtocol = url.replace(/^https?:\/\//i, '');
  const [withoutQuery] = withoutProtocol.split(/[?#]/);
  const label = withoutQuery.replace(/^www\./i, '').replace(/\/$/g, '');

  return label.length > 34 ? `${label.slice(0, 31)}...` : label;
}

function isReferenceUrl(content: string, index: number) {
  const lineStart = content.lastIndexOf('\n', Math.max(0, index - 1)) + 1;
  const paragraphBoundaryIndex = content.lastIndexOf(
    '\n\n',
    Math.max(0, index - 1),
  );
  const paragraphStart =
    paragraphBoundaryIndex === -1 ? 0 : paragraphBoundaryIndex + 2;
  const beforeUrlOnLine = content.slice(lineStart, index);
  const beforeUrlInParagraph = content.slice(paragraphStart, index);
  const trimmedPrefix = beforeUrlOnLine.trimStart();

  if (
    /^(?:sources?|references?|출처|참고)\b/i.test(trimmedPrefix) ||
    /^(?:sources?|references?|출처|참고)\b/i.test(
      beforeUrlInParagraph.trimStart(),
    )
  ) {
    return true;
  }

  return /(?:^|[.!?]\s+)(?:sources?|references?|출처|참고)\s*[:：(]?\s*$/i.test(
    beforeUrlOnLine,
  );
}

function findReferenceSections(content: string) {
  const sections: ReferenceSectionRange[] = [];

  for (const match of content.matchAll(REFERENCE_SECTION_PATTERN)) {
    const prefix = match[1] || '';
    const start = (match.index ?? 0) + prefix.length;
    const bodyStart = start + match[0].length - prefix.length;
    const paragraphEnd = content.indexOf('\n\n', bodyStart);
    const end = paragraphEnd === -1 ? content.length : paragraphEnd;
    const previousSection = sections[sections.length - 1];

    if (previousSection && start < previousSection.end) {
      continue;
    }

    sections.push({ start, bodyStart, end });
  }

  return sections;
}

function splitReferenceItems(body: string) {
  return body
    .split(REFERENCE_ITEM_SEPARATOR_PATTERN)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getUrlsFromReferenceItem(item: string) {
  const urls: string[] = [];

  for (const match of item.matchAll(MESSAGE_URL_PATTERN)) {
    const url = stripTrailingUrlPunctuation(match[0]);

    if (url) {
      urls.push(url);
    }
  }

  return urls;
}

function getReferenceItemTextLabel(item: string) {
  const labelWithoutUrls = item.replace(MESSAGE_URL_PATTERN, (rawUrl) => {
    const url = stripTrailingUrlPunctuation(rawUrl);

    return rawUrl.slice(url.length);
  });

  return cleanReferenceLabel(labelWithoutUrls);
}

function createReferenceBadge(
  id: string,
  label: string,
  url?: string,
): MessageUrlBadge {
  return {
    id,
    kind: 'reference',
    label,
    url,
  };
}

function getReferenceSectionBadges(
  content: string,
  referenceSections: ReferenceSectionRange[],
  startingBadgeCount: number,
) {
  const badges: MessageUrlBadge[] = [];

  for (const section of referenceSections) {
    const body = content.slice(section.bodyStart, section.end);

    for (const item of splitReferenceItems(body)) {
      const urls = getUrlsFromReferenceItem(item);
      const textLabel = getReferenceItemTextLabel(item);

      if (urls.length === 0) {
        if (textLabel) {
          badges.push(
            createReferenceBadge(
              `${startingBadgeCount + badges.length}-${textLabel}`,
              textLabel,
            ),
          );
        }

        continue;
      }

      if (urls.length === 1) {
        const url = urls[0];

        badges.push(
          createReferenceBadge(
            `${startingBadgeCount + badges.length}-${url}`,
            textLabel || formatBadgeLabel(url),
            url,
          ),
        );
        continue;
      }

      for (const url of urls) {
        badges.push(
          createReferenceBadge(
            `${startingBadgeCount + badges.length}-${url}`,
            formatBadgeLabel(url),
            url,
          ),
        );
      }
    }
  }

  return badges;
}

function removeReferenceSections(
  content: string,
  sections: ReferenceSectionRange[],
) {
  if (sections.length === 0) {
    return content;
  }

  const textParts: string[] = [];
  let lastIndex = 0;

  for (const section of sections) {
    textParts.push(content.slice(lastIndex, section.start));
    lastIndex = section.end;
  }

  textParts.push(content.slice(lastIndex));

  return textParts.join('');
}

function condenseBadges(badges: MessageUrlBadge[]) {
  const linkBadgeCount = badges.filter((badge) => badge.kind !== 'tag').length;

  if (linkBadgeCount < 3) {
    return badges;
  }

  const omittedCount = linkBadgeCount - MAX_VISIBLE_BADGES;
  let visibleLinkBadgeCount = 0;
  const hiddenBadges: MessageUrlBadge[] = [];

  return [
    ...badges.filter((badge) => {
      if (badge.kind === 'tag') {
        return true;
      }

      if (visibleLinkBadgeCount >= MAX_VISIBLE_BADGES) {
        hiddenBadges.push(badge);
        return false;
      }

      visibleLinkBadgeCount += 1;
      return true;
    }),
    {
      id: `overflow-${linkBadgeCount}`,
      kind: 'overflow' as const,
      hiddenBadges,
      label: '...',
      omittedCount,
    },
  ];
}

function addReferenceTagBadge(badges: MessageUrlBadge[]) {
  const firstReferenceBadgeIndex = badges.findIndex(
    (badge) => badge.kind === 'reference',
  );

  if (firstReferenceBadgeIndex === -1) {
    return badges;
  }

  return [
    ...badges.slice(0, firstReferenceBadgeIndex),
    REFERENCE_TAG_BADGE,
    ...badges.slice(firstReferenceBadgeIndex),
  ];
}

export function getMessageUrlBadgeParts(content: string): MessageUrlBadgeParts {
  const referenceSections = findReferenceSections(content);
  const contentWithoutReferenceSections = removeReferenceSections(
    content,
    referenceSections,
  );
  const badges: MessageUrlBadge[] = [];
  const textParts: string[] = [];
  let lastIndex = 0;

  for (const match of contentWithoutReferenceSections.matchAll(
    MESSAGE_URL_PATTERN,
  )) {
    const rawUrl = match[0];
    const index = match.index ?? 0;
    const url = stripTrailingUrlPunctuation(rawUrl);

    if (!url) {
      continue;
    }

    textParts.push(contentWithoutReferenceSections.slice(lastIndex, index));
    textParts.push(rawUrl.slice(url.length));
    badges.push({
      id: `${badges.length}-${url}`,
      kind: isReferenceUrl(contentWithoutReferenceSections, index)
        ? 'reference'
        : 'link',
      label: formatBadgeLabel(url),
      url,
    });
    lastIndex = index + rawUrl.length;
  }

  const referenceSectionBadges = getReferenceSectionBadges(
    content,
    referenceSections,
    badges.length,
  );

  if (badges.length === 0) {
    const compactedText = compactMessageText(contentWithoutReferenceSections);

    return {
      text: referenceSectionBadges.length > 0
        ? stripReferenceLabels(compactedText)
        : content,
      badges: referenceSectionBadges.length > 0
        ? condenseBadges(addReferenceTagBadge(referenceSectionBadges))
        : badges,
    };
  }

  textParts.push(contentWithoutReferenceSections.slice(lastIndex));

  const compactedText = compactMessageText(textParts.join(''));
  const allBadges = [...badges, ...referenceSectionBadges];
  const hasReferenceBadges = allBadges.some(
    (badge) => badge.kind === 'reference',
  );

  return {
    text: hasReferenceBadges
      ? stripReferenceLabels(compactedText)
      : compactedText,
    badges: condenseBadges(
      hasReferenceBadges ? addReferenceTagBadge(allBadges) : allBadges,
    ),
  };
}
