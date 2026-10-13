// Resting points sit inside each desktop story beat's fully visible range.
export const desktopStoryStops = [0, 0.09, 0.165, 0.25, 0.34, 0.425, 0.5, 0.56, 0.625, 0.71, 0.9] as const;

export function nextStoryStop(progress: number, direction: 1 | -1) {
  const tolerance = 0.025;
  return direction === 1
    ? desktopStoryStops.find((stop) => stop > progress + tolerance) ?? 0.9
    : [...desktopStoryStops].reverse().find((stop) => stop < progress - tolerance) ?? 0;
}
