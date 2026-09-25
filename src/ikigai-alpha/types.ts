import type { ComprehensiveIkigaiInsight } from "../ikigai-insights/types";

export type FieldId = "love" | "ability" | "meaning" | "paid";

export interface Reflection {
  id: string;
  fieldId: FieldId;
  label: string;
  notes?: string;
  createdAt: number;
  positionSeed: number;
}

export type FieldReflections = Record<FieldId, Reflection[]>;

export interface FieldConfig {
  id: FieldId;
  panelTitle: string;
  lead: string;
  emphasis: string;
  prompt: string;
  inputPlaceholder: string;
  color: string;
  haloColor: string;
  orbitPosition: [number, number, number];
  orbitTilt: [number, number];
  orbitProgress: number;
  planetDeformationSeed: number;
  focusCameraPosition: [number, number, number];
  focusCameraTarget: [number, number, number];
  nodeMotionProfile: {
    drift: number;
    speed: number;
    depth: number;
  };
}

export interface CenterAnalysis {
  coverage: number;
  density: number;
  overlap: number;
  populatedFields: FieldId[];
  totalReflections: number;
  recurringThemes: string[];
  insight: LocalIkigaiInsight;
}

export interface ThemeInsight {
  name: string;
  fields: FieldId[];
  reflectionIds: string[];
}

export interface LocalIkigaiInsight {
  status: string;
  themes: ThemeInsight[];
  statement: string;
  intersections: {
    passion?: string[];
    mission?: string[];
    profession?: string[];
    vocation?: string[];
    core?: string[];
  };
  missingSignals?: string;
  directions: string[];
  experiment: string;
  comprehensive: ComprehensiveIkigaiInsight;
}
