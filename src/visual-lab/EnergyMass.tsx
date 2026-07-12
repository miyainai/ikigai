import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { AdditiveBlending, Mesh, ShaderMaterial, type BufferGeometry, type Vector3Tuple } from "three";
import { noiseGLSL } from "./shaderNoise";

const energyVertex = /* glsl */ `
  ${noiseGLSL}
  uniform float uTime;
  uniform float uPhase;
  varying vec3 vLocal;
  varying vec3 vViewNormal;
  varying vec3 vViewPosition;
  varying float vField;
  void main(){
    vec3 n=normalize(position);
    float broad=snoise(n*1.12+vec3(uPhase,uTime*0.045,-uPhase*0.7));
    vec3 transformed=position*(1.0+broad*0.12);
    transformed.x*=1.12; transformed.y*=0.88;
    vField=broad;
    vLocal=transformed;
    vec4 viewPosition=modelViewMatrix*vec4(transformed,1.0);
    vViewPosition=viewPosition.xyz;
    vViewNormal=normalize(normalMatrix*normal);
    gl_Position=projectionMatrix*viewPosition;
  }
`;

const energyFragment = /* glsl */ `
  ${noiseGLSL}
  uniform float uTime;
  uniform float uPhase;
  uniform float uIntensity;
  uniform float uBalance;
  uniform float uCyanIntensity;
  uniform float uVioletIntensity;
  varying vec3 vLocal;
  varying vec3 vViewNormal;
  varying vec3 vViewPosition;
  varying float vField;
  void main(){
    float boundary=snoise(vLocal*1.35+vec3(uTime*0.025,uPhase,-1.6))*0.5+0.5;
    float depthFade=0.42+max(dot(normalize(vViewNormal),normalize(-vViewPosition)),0.0)*0.58;
    float alpha=smoothstep(0.34,0.72,boundary)*depthFade*uIntensity*0.58;
    vec3 violet=vec3(0.32,0.055,0.82)*uVioletIntensity;
    vec3 cyan=vec3(0.015,0.72,0.88)*uCyanIntensity;
    vec3 aqua=vec3(0.04,0.72,0.6);
    vec3 color=mix(violet,cyan,clamp(uBalance+vField*0.16,0.0,1.0));
    color=mix(color,aqua,max(vLocal.y,0.0)*0.12);
    gl_FragColor=vec4(color*uIntensity,alpha);
  }
`;

interface EnergyMassProps {
  geometry: BufferGeometry;
  position: Vector3Tuple;
  scale: number;
  intensity: number;
  speed: number;
  balance: number;
  phase: number;
  cyanIntensity?: number;
  violetIntensity?: number;
}

export function EnergyMass({geometry,position,scale,intensity,speed,balance,phase,cyanIntensity=1,violetIntensity=1}:EnergyMassProps){
  const meshRef=useRef<Mesh>(null);
  const material=useMemo(()=>new ShaderMaterial({vertexShader:energyVertex,fragmentShader:energyFragment,transparent:true,depthWrite:false,depthTest:true,blending:AdditiveBlending,uniforms:{uTime:{value:0},uPhase:{value:0},uIntensity:{value:0},uBalance:{value:0.5},uCyanIntensity:{value:1},uVioletIntensity:{value:1}}}),[]);
  useEffect(()=>()=>material.dispose(),[material]);
  useFrame((state,delta)=>{
    material.uniforms.uTime.value=state.clock.elapsedTime*speed;
    material.uniforms.uPhase.value=phase;
    material.uniforms.uIntensity.value=intensity;
    material.uniforms.uBalance.value=balance;
    material.uniforms.uCyanIntensity.value=cyanIntensity;
    material.uniforms.uVioletIntensity.value=violetIntensity;
    if(meshRef.current){meshRef.current.rotation.y+=delta*speed*0.18;meshRef.current.rotation.x=Math.sin(state.clock.elapsedTime*speed*0.3+phase)*0.14;}
  });
  return <mesh ref={meshRef} geometry={geometry} material={material} position={position} scale={scale}/>;
}
