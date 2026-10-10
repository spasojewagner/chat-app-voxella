import { describe, expect, it } from "vitest";
import { buildRows, isEmojiOnly, linkify } from "./messages.js";

const msg = (id, senderId, createdAt) => ({ _id: id, senderId, createdAt, text: id });

describe("buildRows", () => {
  it("adds a separator per day and groups close messages from one person", () => {
    const rows = buildRows([
      msg("a1", "ana", "2026-10-09T10:00:00"),
      msg("a2", "ana", "2026-10-09T10:01:00"),
      msg("l1", "luka", "2026-10-09T10:02:00"),
      msg("l2", "luka", "2026-10-09T10:30:00"), // too long after l1
      msg("l3", "luka", "2026-10-10T08:00:00"), // next day
    ]);

    expect(rows.map((r) => (r.type === "day" ? "day" : `${r.message._id}:${r.first ? "F" : ""}${r.last ? "L" : ""}`))).toEqual([
      "day",
      "a1:F",
      "a2:L",
      "l1:FL",
      "l2:FL",
      "day",
      "l3:FL",
    ]);
  });

  it("keys optimistic messages by their client id so the bubble is not re-mounted when confirmed", () => {
    const [, row] = buildRows([{ ...msg("tmp", "ana", "2026-10-09T10:00:00"), clientId: "tmp-1" }]);
    expect(row.key).toBe("tmp-1");
  });
});

describe("isEmojiOnly", () => {
  it("accepts up to three emoji and nothing else", () => {
    expect(isEmojiOnly("👍")).toBe(true);
    expect(isEmojiOnly("🎉🎉🎉")).toBe(true);
    expect(isEmojiOnly("👍🏽")).toBe(true);
    expect(isEmojiOnly("❤️")).toBe(true);
    expect(isEmojiOnly("ok 👍")).toBe(false);
    expect(isEmojiOnly("🎉🎉🎉🎉")).toBe(false);
    expect(isEmojiOnly("123")).toBe(false);
  });
});

describe("linkify", () => {
  it("finds links without swallowing trailing punctuation", () => {
    expect(linkify("see https://example.com/a?b=1, then reply")).toEqual([
      { type: "text", value: "see " },
      { type: "link", value: "https://example.com/a?b=1" },
      { type: "text", value: ", then reply" },
    ]);
    expect(linkify("no links here")).toEqual([{ type: "text", value: "no links here" }]);
  });
});
