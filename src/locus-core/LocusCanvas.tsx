import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { easing } from "maath";
import { type ReactNode, useEffect, useMemo, useRef } from "react";
import { ACESFilmicToneMapping, PerspectiveCamera as ThreePerspectiveCamera, SRGBColorSpace, Vector3 } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { LabParameters } from "../visual-lab/types";

interface CameraFocus { position: [number,number,number]; target: [number,number,number]; }
interface LocusCanvasProps { parameters: LabParameters; resetVersion: number; children: ReactNode; className?: string; cameraFocus?: CameraFocus | null; }

function CameraController({parameters,resetVersion,cameraFocus=null}:{parameters:LabParameters;resetVersion:number;cameraFocus?:CameraFocus|null}){
  const controlsRef=useRef<OrbitControlsImpl>(null);const returning=useRef(true);const home=useMemo(()=>new Vector3(0,0.38,parameters.cameraDistance),[parameters.cameraDistance]);const target=useMemo(()=>new Vector3(0,0.03,0),[]);const focusPosition=useMemo(()=>new Vector3(),[]);const focusTarget=useMemo(()=>new Vector3(),[]);const camera=useThree((state)=>state.camera as ThreePerspectiveCamera);
  useEffect(()=>{returning.current=true;},[cameraFocus,resetVersion]);
  useFrame((_,delta)=>{const controls=controlsRef.current;camera.fov=parameters.fov;camera.updateProjectionMatrix();if(!controls)return;if(returning.current){if(cameraFocus){focusPosition.fromArray(cameraFocus.position);focusTarget.fromArray(cameraFocus.target);}const destination=cameraFocus?focusPosition:home;const lookAt=cameraFocus?focusTarget:target;easing.damp3(camera.position,destination,0.92,delta);easing.damp3(controls.target,lookAt,0.92,delta);if(camera.position.distanceTo(destination)<0.008)returning.current=false;}controls.enabled=!returning.current;controls.update();});
  return <OrbitControls ref={controlsRef} makeDefault enableRotate={false} enablePan={false} enableZoom enableDamping dampingFactor={0.09} zoomSpeed={0.38} minDistance={4.8} maxDistance={8.2} target={[0,0.03,0]}/>;
}

function Exposure({value}:{value:number}){const gl=useThree((state)=>state.gl);useFrame(()=>{gl.toneMappingExposure=value;});return null;}

export function LocusCanvas({parameters,resetVersion,children,className,cameraFocus=null}:LocusCanvasProps){
  return <div className={className}><Canvas dpr={[1,2]} gl={{antialias:true,alpha:false,powerPreference:"high-performance",outputColorSpace:SRGBColorSpace,toneMapping:ACESFilmicToneMapping,toneMappingExposure:parameters.exposure}}><PerspectiveCamera makeDefault position={[0,0.38,parameters.cameraDistance]} fov={parameters.fov} near={0.1} far={80}/><color attach="background" args={["#010207"]}/><ambientLight intensity={0.08}/><directionalLight position={[-4,5,6]} intensity={0.62} color="#c7f5ff"/><directionalLight position={[4,-2,2]} intensity={0.26} color="#654bd4"/>{children}<CameraController parameters={parameters} resetVersion={resetVersion} cameraFocus={cameraFocus}/><Exposure value={parameters.exposure}/><EffectComposer multisampling={0}><Bloom intensity={parameters.bloom} luminanceThreshold={0.82} luminanceSmoothing={0.12} mipmapBlur/></EffectComposer></Canvas></div>;
}
