import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { AdditiveBlending, BackSide, IcosahedronGeometry, Mesh, ShaderMaterial } from "three";
import { noiseGLSL } from "./shaderNoise";
import type { LabParameters } from "./types";
import { EnergyMass } from "./EnergyMass";

const centerVertex = /* glsl */ `
  ${noiseGLSL}
  uniform float uTime;
  uniform float uFrequency;
  uniform float uAmplitude;
  uniform float uSecondary;
  varying vec3 vLocal;
  varying vec3 vViewNormal;
  varying vec3 vViewPosition;
  varying float vLobe;
  void main(){
    vec3 n=normalize(position);
    vec3 drift=vec3(uTime*0.018,-uTime*0.012,uTime*0.009);
    float broad=snoise(n*uFrequency+drift+vec3(0.7,-1.8,2.3));
    float secondary=snoise(n*1.62-drift*0.65+vec3(-2.1,0.4,1.2));
    float convergence=pow(abs(n.x*n.y*n.z)*4.2,1.4)*0.04;
    vec3 transformed=position*(1.0+broad*uAmplitude+secondary*uSecondary+convergence);
    transformed.x*=1.12+n.z*0.025;
    transformed.y*=0.9-n.x*0.022;
    transformed.z*=1.035;
    vLobe=broad;
    vLocal=transformed;
    vec4 viewPosition=modelViewMatrix*vec4(transformed,1.0);
    vViewPosition=viewPosition.xyz;
    vViewNormal=normalize(normalMatrix*normal);
    gl_Position=projectionMatrix*viewPosition;
  }
`;

const centerShellFragment = /* glsl */ `
  ${noiseGLSL}
  uniform float uTime;
  uniform float uOpacity;
  uniform float uEnergy;
  uniform float uThickness;
  varying vec3 vLocal;
  varying vec3 vViewNormal;
  varying vec3 vViewPosition;
  varying float vLobe;
  void main(){
    float rim=pow(1.0-max(dot(normalize(vViewNormal),normalize(-vViewPosition)),0.0),2.9);
    float cyanField=snoise(vLocal*1.05+vec3(uTime*0.012,-1.3,2.6))*0.5+0.5;
    float violetField=snoise(vLocal.yzx*1.3+vec3(-2.2,uTime*0.016,0.5))*0.5+0.5;
    float convergence=smoothstep(0.56,0.8,cyanField*0.58+violetField*0.42);
    vec3 ink=vec3(0.004,0.012,0.035);
    vec3 violet=vec3(0.2,0.055,0.52);
    vec3 cyan=vec3(0.035,0.5,0.64);
    vec3 aqua=vec3(0.08,0.62,0.58);
    vec3 spectral=mix(violet,cyan,cyanField);
    spectral=mix(spectral,aqua,max(vLocal.y,0.0)*0.14);
    vec3 color=mix(ink,spectral,0.06+convergence*0.09);
    color+=spectral*convergence*uEnergy*0.1;
    float rimRegion=smoothstep(0.5,0.78,cyanField*0.62+(1.0-violetField)*0.38);
    color+=mix(violet,cyan,cyanField)*rim*rimRegion*0.68;
    color+=spectral*max(vLobe,0.0)*0.012;
    float thickness=mix(0.35,1.0,clamp(uThickness+vLobe*0.18,0.0,1.0));
    float alpha=uOpacity*(0.16+rim*0.28*rimRegion+convergence*0.05)*thickness;
    gl_FragColor=vec4(color,clamp(alpha,0.012,0.45));
  }
`;

const innerVertex = /* glsl */ `
  ${noiseGLSL}
  uniform float uTime;
  uniform float uAmplitude;
  varying vec3 vLocal;
  varying vec3 vViewNormal;
  varying vec3 vViewPosition;
  void main(){
    vec3 n=normalize(position);
    float a=snoise(n*0.92+vec3(-uTime*0.01,1.4,0.7));
    float b=snoise(n*1.48+vec3(2.2,uTime*0.013,-1.5));
    vec3 transformed=position*(1.0+a*uAmplitude+b*uAmplitude*0.22);
    transformed.x*=1.1; transformed.y*=0.9;
    vLocal=transformed;
    vec4 viewPosition=modelViewMatrix*vec4(transformed,1.0);
    vViewPosition=viewPosition.xyz;
    vViewNormal=normalize(normalMatrix*normal);
    gl_Position=projectionMatrix*viewPosition;
  }
`;

const coreFragment = /* glsl */ `
  ${noiseGLSL}
  uniform float uTime;
  uniform float uDarkness;
  varying vec3 vLocal;
  varying vec3 vViewNormal;
  varying vec3 vViewPosition;
  void main(){
    float field=snoise(vLocal*1.2+vec3(uTime*0.009,-0.8,1.6))*0.5+0.5;
    float side=max(dot(normalize(vViewNormal),normalize(vec3(-0.5,0.32,0.8))),0.0);
    vec3 base=mix(vec3(0.026,0.008,0.09),vec3(0.006,0.065,0.11),field);
    base*=0.72+side*0.16;
    base=mix(base,vec3(0.001,0.003,0.012),uDarkness*0.78);
    gl_FragColor=vec4(base,0.98);
  }
`;

const haloFragment = /* glsl */ `
  ${noiseGLSL}
  uniform float uTime;
  uniform float uIntensity;
  varying vec3 vLocal;
  varying vec3 vViewNormal;
  varying vec3 vViewPosition;
  void main(){
    float rim=pow(1.0-max(dot(normalize(vViewNormal),normalize(-vViewPosition)),0.0),3.5);
    float a=snoise(vLocal*1.02+vec3(uTime*0.01,1.5,-2.0))*0.5+0.5;
    float region=smoothstep(0.48,0.76,a);
    vec3 color=mix(vec3(0.22,0.07,0.68),vec3(0.03,0.58,0.7),a);
    gl_FragColor=vec4(color,region*rim*uIntensity*0.3);
  }
`;

interface CenterSpecimenProps { parameters: LabParameters; }

export function CenterSpecimen({parameters}:CenterSpecimenProps){
  const shellRef=useRef<Mesh>(null);
  const coreRef=useRef<Mesh>(null);
  const geometry=useMemo(()=>new IcosahedronGeometry(0.82,7),[]);
  const shellMaterial=useMemo(()=>new ShaderMaterial({vertexShader:centerVertex,fragmentShader:centerShellFragment,transparent:true,depthWrite:false,uniforms:{uTime:{value:0},uFrequency:{value:0.8},uAmplitude:{value:0},uSecondary:{value:0},uOpacity:{value:0},uEnergy:{value:0},uThickness:{value:0}}}),[]);
  const coreMaterial=useMemo(()=>new ShaderMaterial({vertexShader:innerVertex,fragmentShader:coreFragment,depthWrite:true,uniforms:{uTime:{value:0},uAmplitude:{value:0.1},uDarkness:{value:0}}}),[]);
  const haloMaterial=useMemo(()=>new ShaderMaterial({vertexShader:centerVertex,fragmentShader:haloFragment,transparent:true,depthWrite:false,side:BackSide,blending:AdditiveBlending,uniforms:{uTime:{value:0},uFrequency:{value:0.8},uAmplitude:{value:0.12},uSecondary:{value:0.02},uIntensity:{value:0}}}),[]);
  useEffect(()=>()=>{geometry.dispose();shellMaterial.dispose();coreMaterial.dispose();haloMaterial.dispose();},[coreMaterial,geometry,haloMaterial,shellMaterial]);
  useFrame((state,delta)=>{
    const time=state.clock.elapsedTime;
    shellMaterial.uniforms.uTime.value=time;
    shellMaterial.uniforms.uFrequency.value=parameters.centerLobeFrequency;
    shellMaterial.uniforms.uAmplitude.value=parameters.centerLobeAmplitude;
    shellMaterial.uniforms.uSecondary.value=parameters.centerSecondaryAmplitude;
    shellMaterial.uniforms.uOpacity.value=parameters.centerShellOpacity;
    shellMaterial.uniforms.uEnergy.value=parameters.centerEnergyStrength;
    shellMaterial.uniforms.uThickness.value=parameters.centerShellThickness;
    coreMaterial.uniforms.uTime.value=time*0.62;
    coreMaterial.uniforms.uDarkness.value=parameters.centerCoreDarkness;
    haloMaterial.uniforms.uTime.value=time;
    haloMaterial.uniforms.uFrequency.value=parameters.centerLobeFrequency;
    haloMaterial.uniforms.uIntensity.value=parameters.centerHaloIntensity;
    if(shellRef.current)shellRef.current.rotation.y+=delta*0.014;
    if(coreRef.current)coreRef.current.rotation.y-=delta*0.008;
  });
  return <group scale={parameters.centerScale}>
    <mesh ref={coreRef} geometry={geometry} material={coreMaterial} scale={[0.72,0.56,0.66]}/>
    <EnergyMass geometry={geometry} position={[parameters.centerRegionSeparation,0.1,0.13]} scale={0.27} intensity={parameters.centerEnergyStrength} speed={0.065} balance={0.86} phase={0.7} cyanIntensity={parameters.centerCyanIntensity} violetIntensity={parameters.centerVioletIntensity}/>
    <EnergyMass geometry={geometry} position={[-parameters.centerRegionSeparation*0.8,-0.04,0.02]} scale={0.25} intensity={parameters.centerEnergyStrength*0.92} speed={0.052} balance={0.14} phase={2.8} cyanIntensity={parameters.centerCyanIntensity} violetIntensity={parameters.centerVioletIntensity}/>
    <EnergyMass geometry={geometry} position={[0,-parameters.centerRegionSeparation*0.58,-0.13]} scale={0.22} intensity={parameters.centerEnergyStrength*0.72} speed={0.044} balance={0.58} phase={5.1} cyanIntensity={parameters.centerCyanIntensity} violetIntensity={parameters.centerVioletIntensity}/>
    <mesh ref={shellRef} geometry={geometry} material={shellMaterial}/>
    <mesh geometry={geometry} material={haloMaterial} scale={parameters.centerHaloSize}/>
    <pointLight color="#35bfd1" intensity={parameters.centerHaloIntensity*0.42} distance={2.5}/>
    <pointLight color="#6b35c7" position={[-0.42,0.26,0.18]} intensity={parameters.centerHaloIntensity*0.24} distance={2}/>
  </group>;
}
