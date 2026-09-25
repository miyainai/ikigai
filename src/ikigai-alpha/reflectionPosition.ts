import { Vector3 } from "three";
import type { FieldConfig, Reflection } from "./types";

function hash(value: string) {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return (result >>> 0) / 4294967295;
}

export function reflectionPosition(
  reflection: Reflection,
  index: number,
  config: FieldConfig,
  compact = false,
) {
  const seed = reflection.positionSeed;
  const desktopSlots = [
    [-0.55, 0.14, 0.02],
    [0.55, 0.14, -0.02],
    [-0.55, -0.14, -0.02],
    [0.55, -0.14, 0.02],
    [-0.66, 0, 0.01],
    [0.66, 0, -0.01],
    [-0.38, 0.18, 0],
    [0.38, -0.18, 0],
  ];
  const compactSlots = [
    [-0.45, 0.48, 0.02],
    [0.5, -0.3, -0.02],
    [-0.45, -0.42, -0.02],
    [0.45, -0.42, 0.02],
    [-0.58, 0.04, 0.01],
    [0.45, 0.44, -0.01],
    [-0.2, 0.52, 0],
    [0.22, -0.52, 0],
  ];
  const slots = compact ? compactSlots : desktopSlots;
  const slot = slots[index % slots.length];
  return new Vector3(
    slot[0] + (seed - 0.5) * 0.035,
    slot[1] + (hash(`${reflection.label}y`) - 0.5) * 0.025,
    slot[2] + (hash(`${reflection.positionSeed}z`) - 0.5) * config.nodeMotionProfile.depth,
  );
}
