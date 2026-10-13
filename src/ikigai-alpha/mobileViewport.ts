export type ViewportState = { width: number; height: number; keyboardInset: number };
type ViewportMeasurement = {
  layoutWidth: number;
  visibleWidth?: number;
  layoutHeight: number;
  visibleHeight: number;
  offsetTop: number;
  scale: number;
  editing: boolean;
};

export function measureMobileViewport(previous: ViewportState, measurement: ViewportMeasurement): ViewportState {
  // Pinch zoom changes the visual viewport, not the layout or device orientation.
  if (Math.abs(measurement.scale - 1) > 0.02) return previous;
  const width = Math.min(measurement.layoutWidth, measurement.visibleWidth ?? measurement.layoutWidth);
  const visibleBottom = Math.min(measurement.layoutHeight, measurement.visibleHeight);
  const widthChanged = Math.abs(width - previous.width) > 1;
  const lostHeight = previous.height - visibleBottom;
  const keyboardOpen = !widthChanged && lostHeight > 100 && (measurement.editing || previous.keyboardInset > 0);
  return {
    width,
    height: keyboardOpen ? previous.height : visibleBottom,
    keyboardInset: keyboardOpen ? lostHeight : 0,
  };
}
