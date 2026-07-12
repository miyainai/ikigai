import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import type { MutableRefObject } from "react";
import { AdditiveBlending, BufferAttribute, BufferGeometry, Group, ShaderMaterial } from "three";
import type { LabParameters } from "./types";

const backdropVertex = /* glsl */ `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
const backdropFragment = /* glsl */ `
  uniform float uHaze;
  varying vec2 vUv;
  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
  void main(){
    vec2 p=(vUv-0.5)*vec2(1.8,1.0);
    float left=exp(-dot(p+vec2(0.46,-0.08),p+vec2(0.46,-0.08))*5.8);
    float right=exp(-dot(p-vec2(0.38,0.12),p-vec2(0.38,0.12))*7.4);
    float texture=noise(p*3.2)*0.62+noise(p*7.1)*0.38;
    vec3 color=vec3(0.0015,0.003,0.009);
    color+=vec3(0.018,0.042,0.068)*left*texture*uHaze;
    color+=vec3(0.035,0.014,0.055)*right*texture*uHaze*0.55;
    gl_FragColor=vec4(color,1.0);
  }
`;

function makeStars(count: number, radius: number, seedOffset: number) {
  const positions = new Float32Array(count * 3);
  for (let index = 0; index < count; index += 1) {
    const seed = index + seedOffset;
    const a = Math.sin(seed * 71.17) * 43758.5453;
    const b = Math.sin(seed * 19.91) * 9137.17;
    const c = Math.sin(seed * 43.13) * 1731.37;
    const x = (a - Math.floor(a) - 0.5) * radius * 1.8;
    const y = (b - Math.floor(b) - 0.5) * radius;
    const z = -2 - (c - Math.floor(c)) * radius * 0.65;
    positions.set([x, y, z], index * 3);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  return geometry;
}

interface LabBackdropProps { parameters: LabParameters; yaw: MutableRefObject<number>; pitch: MutableRefObject<number>; }

export function LabBackdrop({ parameters, yaw, pitch }: LabBackdropProps) {
  const nearRef = useRef<Group>(null);
  const farRef = useRef<Group>(null);
  const nearGeometry = useMemo(() => makeStars(86, 15, 7), []);
  const farGeometry = useMemo(() => makeStars(180, 24, 101), []);
  const material = useMemo(() => new ShaderMaterial({ vertexShader: backdropVertex, fragmentShader: backdropFragment, depthTest: false, depthWrite: false, uniforms: { uHaze: { value: 0 } } }), []);

  useEffect(() => () => { nearGeometry.dispose(); farGeometry.dispose(); material.dispose(); }, [farGeometry, material, nearGeometry]);
  useFrame(() => {
    material.uniforms.uHaze.value = parameters.backgroundHaze;
    if (nearRef.current) nearRef.current.rotation.set(pitch.current * 0.12, yaw.current * 0.14, 0);
    if (farRef.current) farRef.current.rotation.set(pitch.current * 0.035, yaw.current * 0.045, 0);
  });

  return (
    <>
      <mesh position={[0, 0, -18]} material={material} renderOrder={-20}><planeGeometry args={[34, 20]} /></mesh>
      <group ref={farRef}><points geometry={farGeometry}><pointsMaterial color="#94a7be" size={0.022} transparent opacity={0.34} depthWrite={false} blending={AdditiveBlending} /></points></group>
      <group ref={nearRef}><points geometry={nearGeometry}><pointsMaterial color="#d8e8f2" size={0.032} transparent opacity={0.52} depthWrite={false} blending={AdditiveBlending} /></points></group>
    </>
  );
}
