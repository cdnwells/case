import type {
  ChatAttachmentRequest,
  MessageAttachment,
} from "../../types/chat";

const FALLBACK_ATTACHMENT_NAME = "Attached file";

function normalizeAttachmentName(name: string): string {
  return name.trim() || FALLBACK_ATTACHMENT_NAME;
}

export function createMessageAttachmentBadges(
  attachments: ChatAttachmentRequest[] | undefined,
): MessageAttachment[] {
  if (!attachments?.length) return [];

  return attachments.map((attachment, index) => {
    const name = normalizeAttachmentName(attachment.name);

    return {
      id: `${attachment.type}-${index}-${name}`,
      type: attachment.type,
      name,
      mimeType: attachment.mimeType,
    };
  });
}
