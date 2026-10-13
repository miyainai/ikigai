import { describe, expect, it } from "vitest";
import { measureMobileViewport } from "./mobileViewport";

const initial = { width: 390, height: 744, keyboardInset: 0 };
const base = { layoutWidth: 390, layoutHeight: 744, visibleHeight: 744, offsetTop: 0, scale: 1, editing: false };

describe("mobile viewport sizing", () => {
  it("fits the visible screen on first load and toolbar resize", () => {
    expect(measureMobileViewport(initial, { ...base, visibleHeight: 694 }).height).toBe(694);
  });
  it("keeps the scene stable with a keyboard and restores after saving", () => {
    const keyboard = measureMobileViewport(initial, { ...base, visibleHeight: 410, editing: true });
    expect(keyboard).toEqual({ width: 390, height: 744, keyboardInset: 334 });
    expect(measureMobileViewport(keyboard, { ...base, visibleHeight: 440 }).height).toBe(744);
    expect(measureMobileViewport(keyboard, base)).toEqual(initial);
  });
  it("does not confuse zoom or pan with keyboard or orientation changes", () => {
    expect(measureMobileViewport(initial, { ...base, visibleHeight: 350, offsetTop: 70, scale: 1.5 })).toEqual(initial);
    expect(measureMobileViewport(initial, { ...base, visibleHeight: 900, scale: 0.8 })).toEqual(initial);
  });
  it("accepts narrow-screen and orientation changes without a false keyboard inset", () => {
    expect(measureMobileViewport(initial, { ...base, layoutWidth: 375, layoutHeight: 667, visibleHeight: 667 })).toEqual({ width: 375, height: 667, keyboardInset: 0 });
    expect(measureMobileViewport(initial, { ...base, layoutWidth: 844, layoutHeight: 390, visibleHeight: 390 })).toEqual({ width: 844, height: 390, keyboardInset: 0 });
  });
  it("resizes a shorter window normally when no input is focused", () => {
    expect(measureMobileViewport(initial, { ...base, layoutHeight: 600, visibleHeight: 600 })).toEqual({ width: 390, height: 600, keyboardInset: 0 });
  });
  it("bounds the shell to the visible width when Safari reports a wider layout", () => {
    expect(measureMobileViewport(initial, { ...base, layoutWidth: 460, visibleWidth: 390 }).width).toBe(390);
  });
  it("does not count Safari's keyboard pan offset as usable height", () => {
    const keyboard = measureMobileViewport(initial, { ...base, visibleHeight: 410, offsetTop: 90, editing: true });
    expect(keyboard.height - keyboard.keyboardInset).toBe(410);
    expect(measureMobileViewport(keyboard, base)).toEqual(initial);
  });
});
