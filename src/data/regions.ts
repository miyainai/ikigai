import type { Vector3Tuple } from "three";

export type RegionId = "love" | "ability" | "meaning" | "sustainability" | "ikigai";

export interface RegionConfig {
  id: Exclude<RegionId, "ikigai">;
  label: string;
  labelLead: string;
  emphasis: string;
  position: Vector3Tuple;
  labelPosition: Vector3Tuple;
  color: string;
  planetColor: string;
  orbitTilt: Vector3Tuple;
  depthAmplitude: number;
  depthPhase: number;
  seed: number;
  speed: number;
  planetAngle: number;
  planetScale: number;
  description: string;
}

export const fields: RegionConfig[] = [
  {
    id: "love",
    label: "What you love",
    labelLead: "What you",
    emphasis: "LOVE",
    position: [0, 1.02, 0.04],
    labelPosition: [0, 0.66, 0.42],
    color: "#866be8",
    planetColor: "#4fd1e3",
    orbitTilt: [0.06, -0.08, 0],
    depthAmplitude: 0.16,
    depthPhase: 0.35,
    seed: 3,
    speed: 0.94,
    planetAngle: 1.5708,
    planetScale: 0.19,
    description: "What experiences make you lose track of time?",
  },
  {
    id: "ability",
    label: "What you’re good at",
    labelLead: "What you’re",
    emphasis: "GOOD AT",
    position: [-1.02, 0, 0.12],
    labelPosition: [-0.68, 0, 0.42],
    color: "#729edf",
    planetColor: "#397fca",
    orbitTilt: [-0.04, 0.12, -0.015],
    depthAmplitude: 0.2,
    depthPhase: 1.45,
    seed: 11,
    speed: 0.82,
    planetAngle: 3.1416,
    planetScale: 0.17,
    description: "What do people repeatedly ask you for help with?",
  },
  {
    id: "meaning",
    label: "What the world needs",
    labelLead: "What the",
    emphasis: "WORLD NEEDS",
    position: [1.02, 0, -0.08],
    labelPosition: [0.68, 0, 0.42],
    color: "#72c6b0",
    planetColor: "#55aa91",
    orbitTilt: [0.05, -0.11, 0.012],
    depthAmplitude: 0.14,
    depthPhase: 2.7,
    seed: 19,
    speed: 0.88,
    planetAngle: 0,
    planetScale: 0.18,
    description: "Whose problems do you care enough to keep thinking about?",
  },
  {
    id: "sustainability",
    label: "What you can be paid for",
    labelLead: "What you can be",
    emphasis: "PAID FOR",
    position: [0, -1.02, -0.02],
    labelPosition: [0, -0.66, 0.42],
    color: "#d5a16b",
    planetColor: "#dc7fa0",
    orbitTilt: [-0.07, 0.06, -0.01],
    depthAmplitude: 0.18,
    depthPhase: 4.05,
    seed: 29,
    speed: 0.74,
    planetAngle: -1.5708,
    planetScale: 0.175,
    description: "What kind of value could support the life you want?",
  },
];

export const centerRegion = {
  id: "ikigai" as const,
  label: "Your Ikigai",
  description: "This is where your recurring energies begin to converge.",
};

export const regions = [...fields, centerRegion];
