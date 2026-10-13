import { describe, expect, it } from "vitest";
import { desktopStoryStops, nextStoryStop } from "./storyNavigation";

describe("landing story navigation", () => {
  it("advances through every visible beat without skipping the final invitation", () => {
    desktopStoryStops.slice(0, -1).forEach((stop, index) => {
      expect(nextStoryStop(stop, 1)).toBe(desktopStoryStops[index + 1]);
    });
  });
  it("returns to the previous beat and clamps at the ends", () => {
    expect(nextStoryStop(0.25, -1)).toBe(0.165);
    expect(nextStoryStop(0, -1)).toBe(0);
    expect(nextStoryStop(1, 1)).toBe(0.9);
  });
  it("handles manual scrolling and subpixel scroll rounding", () => {
    expect(nextStoryStop(0.12, 1)).toBe(0.165);
    expect(nextStoryStop(0.0899, 1)).toBe(0.165);
    expect(nextStoryStop(0.1651, -1)).toBe(0.09);
  });
});
