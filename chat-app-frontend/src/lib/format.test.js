import { describe, expect, it } from "vitest";
import { formatDayLabel, formatLastSeen, formatListTime, initials } from "./format.js";

const now = new Date(2026, 9, 10, 15, 30); // Saturday 10 Oct 2026, 15:30
const at = (days, hours = 12, minutes = 0) => new Date(2026, 9, 10 - days, hours, minutes);

describe("conversation list time", () => {
  it("shows the time today, then Yesterday, the weekday and finally the date", () => {
    expect(formatListTime(at(0, 9, 5), now)).toBe("09:05");
    expect(formatListTime(at(1), now)).toBe("Yesterday");
    expect(formatListTime(at(3), now)).toBe("Wed");
    expect(formatListTime(at(20), now)).toBe("20 Sept");
    expect(formatListTime(new Date(2025, 0, 2), now)).toBe("2 Jan 2025");
  });
});

describe("day separators", () => {
  it("names recent days and dates older ones", () => {
    expect(formatDayLabel(at(0), now)).toBe("Today");
    expect(formatDayLabel(at(1), now)).toBe("Yesterday");
    expect(formatDayLabel(at(2), now)).toBe("Thursday");
    expect(formatDayLabel(at(30), now)).toBe("Thursday, 10 Sept");
  });
});

describe("last seen", () => {
  it("gets less precise as time passes", () => {
    expect(formatLastSeen(null, now)).toBe("Offline");
    expect(formatLastSeen(new Date(now - 20_000), now)).toBe("Last seen just now");
    expect(formatLastSeen(new Date(now - 12 * 60_000), now)).toBe("Last seen 12 min ago");
    expect(formatLastSeen(at(0, 9, 15), now)).toBe("Last seen today at 09:15");
    expect(formatLastSeen(at(1, 22, 40), now)).toBe("Last seen yesterday at 22:40");
  });
});

describe("initials", () => {
  it("uses the first and last name", () => {
    expect(initials("Ana Marija Petrović")).toBe("AP");
    expect(initials("luka")).toBe("L");
    expect(initials("  ")).toBe("?");
  });
});
