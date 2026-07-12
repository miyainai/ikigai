import { InertialUniverse } from "../locus-core/InertialUniverse";
import { CenterSpecimen } from "./CenterSpecimen";
import { LabBackdrop } from "./LabBackdrop";
import { LabOrbit } from "./LabOrbit";
import type { LabParameters } from "./types";

interface LabRigProps { parameters: LabParameters; resetVersion: number; }

export function LabRig({parameters,resetVersion}:LabRigProps){
  return <InertialUniverse resetVersion={resetVersion} renderBackdrop={(yaw,pitch)=><LabBackdrop parameters={parameters} yaw={yaw} pitch={pitch}/>}><group position={[-1.05,0.02,0]}><LabOrbit parameters={parameters}/></group><group position={[1.38,-0.03,0.08]}><CenterSpecimen parameters={parameters}/></group></InertialUniverse>;
}
