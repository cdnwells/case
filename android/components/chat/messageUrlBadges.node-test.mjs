import assert from "node:assert/strict";
import test from "node:test";
import { getMessageUrlBadgeParts } from "./messageUrlBadges.ts";

test("message URL badge parts remove URLs from the visible chat text", () => {
  const parts = getMessageUrlBadgeParts(
    "Read https://example.com/docs and https://www.openai.com/research.",
  );

  assert.equal(parts.text, "Read and.");
  assert.deepEqual(
    parts.badges.map(({ kind, label, url }) => ({ kind, label, url })),
    [
      {
        kind: "link",
        label: "example.com/docs",
        url: "https://example.com/docs",
      },
      {
        kind: "link",
        label: "openai.com/research",
        url: "https://www.openai.com/research",
      },
    ],
  );
});

test("message URL badge parts leaves ordinary messages unchanged", () => {
  const content = "No links here.";
  const parts = getMessageUrlBadgeParts(content);

  assert.equal(parts.text, content);
  assert.deepEqual(parts.badges, []);
});

test("message URL badge parts preserves markdown link labels", () => {
  const parts = getMessageUrlBadgeParts(
    "Read [the docs](https://example.com/docs).",
  );

  assert.equal(parts.text, "Read the docs.");
  assert.deepEqual(
    parts.badges.map(({ kind, label, url }) => ({ kind, label, url })),
    [
      {
        kind: "link",
        label: "example.com/docs",
        url: "https://example.com/docs",
      },
    ],
  );
});

test("message URL badge parts renders source-like URLs as reference badges without visible source text", () => {
  const parts = getMessageUrlBadgeParts("Source (https://example.com).");

  assert.equal(parts.text, "");
  assert.deepEqual(
    parts.badges.map(({ kind, label, url }) => ({ kind, label, url })),
    [
      { kind: "tag", label: "출처", url: undefined },
      { kind: "reference", label: "example.com", url: "https://example.com" },
    ],
  );
});

test("message URL badge parts renders Korean source labels as badge tags", () => {
  const parts = getMessageUrlBadgeParts("출처: https://example.kr/docs");

  assert.equal(parts.text, "");
  assert.deepEqual(
    parts.badges.map(({ kind, label, url }) => ({ kind, label, url })),
    [
      { kind: "tag", label: "출처", url: undefined },
      {
        kind: "reference",
        label: "example.kr/docs",
        url: "https://example.kr/docs",
      },
    ],
  );
});

test("message URL badge parts renders named Korean sources as reference badges", () => {
  const parts = getMessageUrlBadgeParts(
    "요약입니다.\n\n출처: OpenAI, Anthropic, 한국경제",
  );

  assert.equal(parts.text, "요약입니다.");
  assert.deepEqual(
    parts.badges.map(({ kind, label, omittedCount, url, hiddenBadges }) => ({
      kind,
      label,
      omittedCount,
      url,
      hiddenLabels: hiddenBadges?.map((badge) => badge.label),
    })),
    [
      {
        kind: "tag",
        label: "출처",
        omittedCount: undefined,
        url: undefined,
        hiddenLabels: undefined,
      },
      {
        kind: "reference",
        label: "OpenAI",
        omittedCount: undefined,
        url: undefined,
        hiddenLabels: undefined,
      },
      {
        kind: "reference",
        label: "Anthropic",
        omittedCount: undefined,
        url: undefined,
        hiddenLabels: undefined,
      },
      {
        kind: "overflow",
        label: "...",
        omittedCount: 1,
        url: undefined,
        hiddenLabels: ["한국경제"],
      },
    ],
  );
});

test("message URL badge parts uses markdown source labels for linked references", () => {
  const parts = getMessageUrlBadgeParts(
    "출처: [OpenAI](https://openai.com), https://example.com/report",
  );

  assert.equal(parts.text, "");
  assert.deepEqual(
    parts.badges.map(({ kind, label, url }) => ({ kind, label, url })),
    [
      { kind: "tag", label: "출처", url: undefined },
      { kind: "reference", label: "OpenAI", url: "https://openai.com" },
      {
        kind: "reference",
        label: "example.com/report",
        url: "https://example.com/report",
      },
    ],
  );
});

test("message URL badge parts does not treat ordinary source words as citations", () => {
  const content = "Sources can vary without becoming badges.";
  const parts = getMessageUrlBadgeParts(content);

  assert.equal(parts.text, content);
  assert.deepEqual(parts.badges, []);
});

test("message URL badge labels stay brief", () => {
  const parts = getMessageUrlBadgeParts(
    "See https://example.com/a/very/long/path/that/keeps/going",
  );

  assert.equal(parts.text, "See");
  assert.equal(parts.badges[0].label.endsWith("..."), true);
  assert.equal(parts.badges[0].label.length <= 34, true);
});

test("message URL badge parts condenses three or more badges with an ellipsis badge", () => {
  const parts = getMessageUrlBadgeParts(
    [
      "Sources:",
      "https://one.example/a",
      "https://two.example/b",
      "https://three.example/c",
      "https://four.example/d",
    ].join("\n"),
  );

  assert.equal(parts.text, "");
  assert.deepEqual(
    parts.badges.map(({ kind, label, omittedCount, url }) => ({
      kind,
      label,
      omittedCount,
      url,
    })),
    [
      {
        kind: "tag",
        label: "출처",
        omittedCount: undefined,
        url: undefined,
      },
      {
        kind: "reference",
        label: "one.example/a",
        omittedCount: undefined,
        url: "https://one.example/a",
      },
      {
        kind: "reference",
        label: "two.example/b",
        omittedCount: undefined,
        url: "https://two.example/b",
      },
      {
        kind: "overflow",
        label: "...",
        omittedCount: 2,
        url: undefined,
      },
    ],
  );
  assert.deepEqual(
    parts.badges
      .find((badge) => badge.kind === "overflow")
      ?.hiddenBadges?.map(({ label, url }) => ({ label, url })),
    [
      { label: "three.example/c", url: "https://three.example/c" },
      { label: "four.example/d", url: "https://four.example/d" },
    ],
  );
});
