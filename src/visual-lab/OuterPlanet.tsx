import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { AdditiveBlending, BackSide, IcosahedronGeometry, Mesh, ShaderMaterial } from "three";
import { noiseGLSL } from "./shaderNoise";
import type { LabParameters } from "./types";
import { EnergyMass } from "./EnergyMass";

const shellVertex = /* glsl */ `
  ${noiseGLSL}
  uniform float uTime;
  uniform float uPrimaryAmplitude;
  uniform float uPrimaryFrequency;
  uniform float uSecondaryAmplitude;
  uniform float uSecondaryFrequency;
  varying vec3 vLocal;
  varying vec3 vViewNormal;
  varying vec3 vViewPosition;
  varying float vPrimary;
  void main(){
    vec3 n=normalize(position);
    vec3 drift=vec3(uTime*0.032,-uTime*0.021,uTime*0.016);
    float primary=snoise(n*uPrimaryFrequency+drift+vec3(1.4,-0.8,2.1));
    float secondary=snoise(n*uSecondaryFrequency-drift*0.7+vec3(-2.3,1.7,0.4));
    float displacement=primary*uPrimaryAmplitude+secondary*uSecondaryAmplitude;
    vec3 transformed=position*(1.0+displacement);
    transformed.x*=0.96+n.y*0.025;
    transformed.y*=1.045-n.z*0.018;
    vPrimary=primary;
    vLocal=transformed;
    vec4 viewPosition=modelViewMatrix*vec4(transformed,1.0);
    vViewPosition=viewPosition.xyz;
    vViewNormal=normalize(normalMatrix*normal);
    gl_Position=projectionMatrix*viewPosition;
  }
`;

const shellFragment = /* glsl */ `
  ${noiseGLSL}
  uniform float uTime;
  uniform float uOpacity;
  uniform float uFresnel;
  uniform float uTint;
  uniform float uTransmission;
  uniform float uRimBalance;
  varying vec3 vLocal;
  varying vec3 vViewNormal;
  varying vec3 vViewPosition;
  varying float vPrimary;
  void main(){
    vec3 viewDirection=normalize(-vViewPosition);
    float rim=pow(1.0-max(dot(normalize(vViewNormal),viewDirection),0.0),3.1);
    float colorField=snoise(vLocal*1.25+vec3(uTime*0.018,1.6,-0.7))*0.5+0.5;
    float localized=smoothstep(0.52,0.84,snoise(vLocal*1.8+vec3(-1.4,uTime*0.026,2.7))*0.5+0.5);
    vec3 deep=vec3(0.006,0.018,0.05);
    vec3 violet=vec3(0.23,0.09,0.58);
    vec3 cyan=vec3(0.045,0.48,0.62);
    vec3 spectral=mix(violet,cyan,clamp(colorField+vLocal.y*0.12,0.0,1.0));
    vec3 color=mix(deep,spectral,(0.08+colorField*0.09)*uTint);
    color+=spectral*localized*0.12*uTint;
    float rimRegion=smoothstep(0.48,0.78,localized*0.72+(1.0-colorField)*0.28);
    vec3 rimColor=mix(violet,cyan,clamp(uRimBalance+vLocal.y*0.2,0.0,1.0));
    color+=rimColor*rim*uFresnel*rimRegion;
    color+=spectral*max(vPrimary,0.0)*0.018;
    float alpha=uOpacity*(0.18+rim*0.32*rimRegion+localized*0.08)*(1.0-uTransmission*0.62);
    gl_FragColor=vec4(color,clamp(alpha,0.015,0.46));
  }
`;

const volumeVertex = /* glsl */ `
  ${noiseGLSL}
  uniform float uTime;
  uniform float uDeformation;
  varying vec3 vLocal;
  varying vec3 vViewNormal;
  varying vec3 vViewPosition;
  void main(){
    vec3 n=normalize(position);
    float field=snoise(n*1.18+vec3(-uTime*0.018,uTime*0.014,1.9));
    vec3 transformed=position*(1.0+field*uDeformation);
    transformed.x*=1.04; transformed.y*=0.96;
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
  uniform float uOpacity;
  varying vec3 vLocal;
  varying vec3 vViewNormal;
  varying vec3 vViewPosition;
  void main(){
    float field=snoise(vLocal*1.55+vec3(uTime*0.015,-1.8,0.6))*0.5+0.5;
    float softLight=max(dot(normalize(vViewNormal),normalize(vec3(-0.35,0.5,0.72))),0.0);
    vec3 violet=vec3(0.035,0.018,0.13);
    vec3 blue=vec3(0.012,0.09,0.16);
    vec3 color=mix(violet,blue,field)*(0.7+softLight*0.22);
    color=mix(color,vec3(0.002,0.005,0.016),uDarkness*0.72);
    gl_FragColor=vec4(color,uOpacity);
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
    float rim=pow(1.0-max(dot(normalize(vViewNormal),normalize(-vViewPosition)),0.0),3.8);
    float region=smoothstep(0.48,0.82,snoise(vLocal*1.3+vec3(uTime*0.018,-0.7,2.4))*0.5+0.5);
    vec3 color=mix(vec3(0.24,0.08,0.7),vec3(0.04,0.62,0.78),region);
    gl_FragColor=vec4(color,region*rim*uIntensity*0.28);
  }
`;

interface OuterPlanetProps { parameters: LabParameters; }

export function OuterPlanet({ parameters }: OuterPlanetProps) {
  const shellRef=useRef<Mesh>(null);
  const coreRef=useRef<Mesh>(null);
  const geometry=useMemo(()=>new IcosahedronGeometry(0.42,7),[]);
  const shellMaterial=useMemo(()=>new ShaderMaterial({vertexShader:shellVertex,fragmentShader:shellFragment,transparent:true,depthWrite:false,uniforms:{uTime:{value:0},uPrimaryAmplitude:{value:0},uPrimaryFrequency:{value:1},uSecondaryAmplitude:{value:0},uSecondaryFrequency:{value:2},uOpacity:{value:0},uFresnel:{value:0},uTint:{value:0},uTransmission:{value:0},uRimBalance:{value:0}}}),[]);
  const coreMaterial=useMemo(()=>new ShaderMaterial({vertexShader:volumeVertex,fragmentShader:coreFragment,transparent:true,depthWrite:true,uniforms:{uTime:{value:0},uDeformation:{value:0.05},uDarkness:{value:0},uOpacity:{value:1}}}),[]);
  const haloMaterial=useMemo(()=>new ShaderMaterial({vertexShader:volumeVertex,fragmentShader:haloFragment,transparent:true,depthWrite:false,side:BackSide,blending:AdditiveBlending,uniforms:{uTime:{value:0},uDeformation:{value:0.05},uIntensity:{value:0}}}),[]);

  useEffect(()=>()=>{geometry.dispose();shellMaterial.dispose();coreMaterial.dispose();haloMaterial.dispose();},[coreMaterial,geometry,haloMaterial,shellMaterial]);
  useFrame((state,delta)=>{
    const time=state.clock.elapsedTime*parameters.planetSpeed;
    shellMaterial.uniforms.uTime.value=time;
    shellMaterial.uniforms.uPrimaryAmplitude.value=parameters.planetPrimaryAmplitude;
    shellMaterial.uniforms.uPrimaryFrequency.value=parameters.planetPrimaryFrequency;
    shellMaterial.uniforms.uSecondaryAmplitude.value=parameters.planetSecondaryAmplitude;
    shellMaterial.uniforms.uSecondaryFrequency.value=parameters.planetSecondaryFrequency;
    shellMaterial.uniforms.uOpacity.value=parameters.planetShellOpacity;
    shellMaterial.uniforms.uFresnel.value=parameters.planetFresnelStrength;
    shellMaterial.uniforms.uTint.value=parameters.planetShellTint;
    shellMaterial.uniforms.uTransmission.value=parameters.planetTransmission;
    shellMaterial.uniforms.uRimBalance.value=parameters.planetRimColorBalance;
    coreMaterial.uniforms.uTime.value=time*0.72;
    coreMaterial.uniforms.uDarkness.value=parameters.planetCoreDarkness;
    coreMaterial.uniforms.uOpacity.value=parameters.planetCoreOpacity;
    coreMaterial.uniforms.uDeformation.value=parameters.planetCoreDeformation;
    haloMaterial.uniforms.uTime.value=time;
    haloMaterial.uniforms.uIntensity.value=parameters.planetHaloIntensity;
    if(shellRef.current)shellRef.current.rotation.y+=delta*0.022;
    if(coreRef.current)coreRef.current.rotation.y-=delta*0.015;
  });

  return <group>
    <mesh ref={coreRef} geometry={geometry} material={coreMaterial} scale={parameters.planetCoreScale}/>
    {[
      {position:[0.11,0.08,0.12] as [number,number,number],phase:0.4,balance:Math.min(parameters.planetEnergyColorBalance+0.22,1)},
      {position:[-0.12,-0.04,0.04] as [number,number,number],phase:2.1,balance:Math.max(parameters.planetEnergyColorBalance-0.28,0)},
      {position:[0.02,-0.14,-0.08] as [number,number,number],phase:4.3,balance:parameters.planetEnergyColorBalance},
      {position:[-0.05,0.14,-0.12] as [number,number,number],phase:5.7,balance:0.66},
    ].slice(0,Math.round(parameters.planetEnergyRegionCount)).map((region,index)=><EnergyMass key={index} geometry={geometry} position={region.position} scale={parameters.planetEnergyScale/0.42} intensity={parameters.planetEnergyStrength} speed={parameters.planetEnergySpeed} balance={region.balance} phase={region.phase}/>)}
    <mesh ref={shellRef} geometry={geometry} material={shellMaterial}/>
    <mesh geometry={geometry} material={haloMaterial} scale={1.055}/>
  </group>;
}
