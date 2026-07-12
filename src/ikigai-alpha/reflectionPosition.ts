import { Vector3 } from "three";
import type { LoveReflection } from "./types";

function hash(value: string) {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return (result >>> 0) / 4294967295;
}

export function reflectionPosition(reflection: LoveReflection, index: number) {
  const seed = hash(reflection.id);
  const slots = [
    [-0.56, 0.52, 0.18],
    [0.56, 0.52, -0.12],
    [-0.62, -0.48, -0.18],
    [0.62, -0.48, 0.22],
    [0, 0.72, -0.12],
    [0, -0.7, 0.12],
    [-0.76, 0.02, 0.1],
    [0.76, 0.02, -0.1],
  ];
  const slot = slots[index % slots.length];
  return new Vector3(
    slot[0] + (seed - 0.5) * 0.035,
    slot[1] + (hash(`${reflection.label}y`) - 0.5) * 0.025,
    slot[2] + (hash(`${reflection.id}z`) - 0.5) * 0.04,
  );
}
