import { LocusCanvas } from "../locus-core/LocusCanvas";
import { LabRig } from "./LabRig";
import type { LabParameters } from "./types";

interface LabSceneProps { parameters: LabParameters; resetVersion: number; }

export function LabScene({parameters,resetVersion}:LabSceneProps){
  return <LocusCanvas className="lab-canvas" parameters={parameters} resetVersion={resetVersion}><LabRig parameters={parameters} resetVersion={resetVersion}/></LocusCanvas>;
}
