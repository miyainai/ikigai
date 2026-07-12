import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { ShaderMaterial } from "three";

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.52;
    for (int index = 0; index < 4; index++) {
      value += noise(p) * amplitude;
      p = p * 2.03 + vec2(3.2, 1.7);
      amplitude *= 0.48;
    }
    return value;
  }

  void main() {
    vec2 p = (vUv - 0.5) * vec2(1.7, 1.0);
    float drift = uTime * 0.006;
    float cloudA = fbm(p * 2.2 + vec2(drift, -drift * 0.7));
    float cloudB = fbm(p * 3.4 - vec2(drift * 0.4, drift));
    float centerHaze = exp(-dot(p - vec2(0.16, 0.02), p - vec2(0.16, 0.02)) * 2.1);
    float edgeHaze = exp(-dot(p + vec2(0.52, 0.3), p + vec2(0.52, 0.3)) * 4.2);
    float nebula = smoothstep(0.44, 0.82, cloudA * 0.7 + cloudB * 0.3);

    vec3 color = vec3(0.003, 0.007, 0.018);
    color += vec3(0.018, 0.045, 0.075) * centerHaze * (0.32 + nebula * 0.68);
    color += vec3(0.035, 0.018, 0.07) * edgeHaze * nebula * 0.42;
    color += vec3(0.01, 0.035, 0.045) * nebula * 0.18;
    gl_FragColor = vec4(color, 1.0);
  }
`;

export function CosmicBackdrop() {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader,
        fragmentShader,
        depthTest: false,
        depthWrite: false,
        uniforms: { uTime: { value: 0 } },
      }),
    [],
  );

  useEffect(() => () => material.dispose(), [material]);
  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <mesh position={[0.8, 0, -10]} material={material} renderOrder={-10}>
      <planeGeometry args={[28, 16]} />
    </mesh>
  );
}
