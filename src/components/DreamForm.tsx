import { useFrame } from "@react-three/fiber";
import { easing } from "maath";
import { useEffect, useMemo, useRef } from "react";
import { Color, Mesh, ShaderMaterial } from "three";

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uDeformation;
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vec3 n = normalize(position);
    float broad = sin(n.x * 3.7 + uTime * 0.34) * 0.42;
    broad += sin(n.y * 3.1 - uTime * 0.27 + 1.7) * 0.35;
    broad += sin(n.z * 3.4 + uTime * 0.21 + 3.2) * 0.23;
    float breath = sin(uTime * 0.48) * 0.16;
    vec3 transformed = position * (1.0 + (broad + breath) * uDeformation);
    transformed.x *= 1.0 + sin(n.y * 2.2 + uTime * 0.18) * uDeformation * 0.18;
    transformed.y *= 1.0 + cos(n.x * 2.0 - uTime * 0.16) * uDeformation * 0.14;
    transformed.z *= 1.0 + sin(n.x * 2.6 + n.y * 1.3 + uTime * 0.14) * uDeformation * 0.32;
    vNormal = normalize(normalMatrix * normal);
    vPosition = transformed;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uGlow;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vec3 normal = normalize(vNormal);
    float fresnel = pow(1.0 - max(normal.z, 0.0), 2.15);
    float diffuse = max(dot(normal, normalize(vec3(-0.38, 0.52, 0.76))), 0.0);
    float flow = sin(vPosition.y * 3.2 + vPosition.x * 1.7 + uTime * 0.22) * 0.5 + 0.5;
    float filamentA = pow(0.5 + 0.5 * sin(vPosition.x * 8.0 + vPosition.y * 5.4 + uTime * 0.34), 14.0);
    float filamentB = pow(0.5 + 0.5 * sin(vPosition.z * 9.0 - vPosition.x * 4.2 - uTime * 0.27), 16.0);
    float filaments = max(filamentA, filamentB);
    float vertical = clamp(vPosition.y * 0.42 + 0.5, 0.0, 1.0);
    vec3 spectral = mix(uColorA, uColorB, clamp(flow * 0.55 + vertical * 0.45, 0.0, 1.0));
    float core = 1.0 - smoothstep(0.05, 1.08, length(vPosition));
    vec3 color = spectral * (0.32 + diffuse * 0.28 + flow * 0.26) * (0.82 + uGlow * 0.5);
    color += mix(uColorB, vec3(0.94, 0.99, 1.0), 0.68) * fresnel * (0.82 + uGlow * 0.92);
    color += spectral * flow * uGlow * 0.28;
    color += mix(uColorA, vec3(0.9, 0.98, 1.0), 0.76) * filaments * (0.15 + uGlow * 0.23);
    color += mix(uColorA, uColorB, flow) * core * (0.12 + uGlow * 0.18);
    gl_FragColor = vec4(color, 1.0);
  }
`;

interface DreamFormProps {
  colorA: string;
  colorB: string;
  deformation: number;
  glow: number;
  reducedMotion: boolean;
}

export function DreamForm({ colorA, colorB, deformation, glow, reducedMotion }: DreamFormProps) {
  const meshRef = useRef<Mesh>(null);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          uTime: { value: 0 },
          uDeformation: { value: deformation },
          uGlow: { value: glow },
          uColorA: { value: new Color(colorA) },
          uColorB: { value: new Color(colorB) },
        },
        toneMapped: true,
      }),
    [colorA, colorB, deformation, glow],
  );

  useEffect(() => () => material.dispose(), [material]);

  useFrame((state, delta) => {
    material.uniforms.uTime.value = state.clock.elapsedTime * (reducedMotion ? 0.08 : 1);
    easing.damp(material.uniforms.uGlow, "value", glow, 0.35, delta);
    if (meshRef.current) meshRef.current.rotation.y += delta * (reducedMotion ? 0.01 : 0.08);
  });

  return (
    <mesh ref={meshRef} material={material}>
      <sphereGeometry args={[1, 64, 48]} />
    </mesh>
  );
}
