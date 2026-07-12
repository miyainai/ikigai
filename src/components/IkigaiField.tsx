import { Html, Line } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { easing } from "maath";
import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  Group,
  Vector2,
  Vector3,
} from "three";
import type { RegionConfig, RegionId } from "../data/regions";
import { DreamForm } from "./DreamForm";

interface IkigaiFieldProps {
  config: RegionConfig;
  hoveredRegion: RegionId | null;
  selectedRegion: RegionId | null;
  reducedMotion: boolean;
  onHover: (region: RegionId | null) => void;
  onSelect: (region: RegionId) => void;
  dragging: boolean;
}

function curveArc(curve: CatmullRomCurve3, start: number, end: number) {
  return Array.from({ length: 25 }, (_, index) => {
    const progress = start + (index / 24) * (end - start);
    return curve.getPointAt(progress);
  });
}

function seededValue(seed: number) {
  const value = Math.sin(seed * 91.73) * 43758.5453;
  return value - Math.floor(value);
}

export function IkigaiField({
  config,
  hoveredRegion,
  selectedRegion,
  reducedMotion,
  onHover,
  onSelect,
  dragging,
}: IkigaiFieldProps) {
  const groupRef = useRef<Group>(null);
  const planetAnchorRef = useRef<Group>(null);
  const orbitCurve = useMemo(() => {
    const points = Array.from({ length: 128 }, (_, index) => {
      const angle = (index / 128) * Math.PI * 2;
      return new Vector3(
        Math.cos(angle) * 1.28,
        Math.sin(angle) * 1.28,
        Math.sin(angle + config.depthPhase) * config.depthAmplitude,
      );
    });
    return new CatmullRomCurve3(points, true, "centripetal");
  }, [config.depthAmplitude, config.depthPhase]);
  const orbitArcs = useMemo(() => {
    const segments = [
      { start: 0.003, end: 0.146, opacity: 0.2 },
      { start: 0.156, end: 0.299, opacity: 0.055 },
      { start: 0.309, end: 0.468, opacity: 0.15 },
      { start: 0.478, end: 0.649, opacity: 0.04 },
      { start: 0.659, end: 0.824, opacity: 0.17 },
      { start: 0.834, end: 0.998, opacity: 0.07 },
    ];
    return segments.map((segment) => {
      const midpoint = (segment.start + segment.end) * 0.5 * Math.PI * 2;
      const depth = Math.sin(midpoint + config.depthPhase);
      return {
        points: curveArc(orbitCurve, segment.start, segment.end),
        opacity: segment.opacity * (0.72 + (depth + 1) * 0.18),
      };
    });
  }, [config.depthPhase, orbitCurve]);
  const orbitPoints = useMemo(() => orbitCurve.getSpacedPoints(192), [orbitCurve]);
  const particles = useMemo(() => {
    const count = 18;
    const values = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      const angle = seededValue(config.seed + index * 3) * Math.PI * 2;
      const radius = Math.sqrt(seededValue(config.seed + index * 7 + 1)) * 1.05;
      values[index * 3] = Math.cos(angle) * radius;
      values[index * 3 + 1] = Math.sin(angle) * radius;
      values[index * 3 + 2] = (seededValue(config.seed + index * 11 + 2) - 0.5) * 0.32;
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(values, 3));
    return geometry;
  }, [config.seed]);
  const orbitDust = useMemo(() => {
    const values = new Float32Array(18 * 3);
    const point = new Vector3();
    for (let index = 0; index < 18; index += 1) {
      orbitCurve.getPointAt((index / 18 + seededValue(config.seed + index) * 0.018) % 1, point);
      values[index * 3] = point.x;
      values[index * 3 + 1] = point.y;
      values[index * 3 + 2] = point.z;
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(values, 3));
    return geometry;
  }, [config.seed, orbitCurve]);
  const pointerDown = useMemo(() => new Vector2(), []);
  const basePosition = useMemo(() => new Vector3(...config.position), [config.position]);
  const targetPosition = useMemo(() => new Vector3(), []);
  const planetPosition = useMemo(() => new Vector3(), []);
  const hovered = hoveredRegion === config.id;
  const selected = selectedRegion === config.id;
  const quiet = (hoveredRegion !== null && !hovered) || (selectedRegion !== null && !selected);

  useEffect(() => () => {
    particles.dispose();
    orbitDust.dispose();
  }, [orbitDust, particles]);

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const outward = hovered || selected ? 1.045 : 1;
    targetPosition.copy(basePosition).multiplyScalar(outward);
    easing.damp3(group.position, targetPosition, 0.42, delta);
    const scale = selected ? 1.09 : hovered ? 1.035 : 1;
    easing.damp3(group.scale, [scale, scale, scale], 0.38, delta);
    const time = state.clock.elapsedTime * (reducedMotion ? 0.08 : 1);
    if (planetAnchorRef.current) {
      const baseProgress = config.planetAngle / (Math.PI * 2);
      const progress = ((baseProgress + time * config.speed * 0.012) % 1 + 1) % 1;
      orbitCurve.getPointAt(progress, planetPosition);
      planetAnchorRef.current.position.copy(planetPosition);
      const planetPulse = 1 + Math.sin(time * 0.72 + config.seed) * 0.035;
      planetAnchorRef.current.scale.setScalar(config.planetScale * planetPulse);
    }
  });

  return (
    <group
      ref={groupRef}
      position={config.position}
      onPointerEnter={(event) => {
        event.stopPropagation();
        if (!selectedRegion) onHover(config.id);
        (event.nativeEvent.target as HTMLElement).style.cursor = "pointer";
      }}
      onPointerLeave={(event) => {
        event.stopPropagation();
        if (!selectedRegion) onHover(null);
        (event.nativeEvent.target as HTMLElement).style.cursor = "grab";
      }}
      onPointerDown={(event) => {
        pointerDown.set(event.nativeEvent.clientX, event.nativeEvent.clientY);
      }}
      onPointerUp={(event) => {
        event.stopPropagation();
        const x = event.nativeEvent.clientX - pointerDown.x;
        const y = event.nativeEvent.clientY - pointerDown.y;
        if (x * x + y * y <= 25) onSelect(config.id);
      }}
    >
      <mesh position={[0, 0, -0.42]} scale={[1, 1, 0.05]}>
        <sphereGeometry args={[1.25, 36, 24]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>

      <group rotation={config.orbitTilt}>
        <Line
          points={orbitPoints}
          color={config.color}
          transparent
          opacity={quiet ? 0.055 : hovered || selected ? 0.68 : 0.34}
          lineWidth={hovered || selected ? 1.05 : 0.72}
          depthTest
          depthWrite
        />
        <Line
          points={orbitPoints}
          color={config.planetColor}
          transparent
          opacity={quiet ? 0.008 : hovered || selected ? 0.16 : 0.065}
          lineWidth={hovered || selected ? 3.2 : 2.25}
          depthTest
          depthWrite={false}
        />
        {orbitArcs.map((arc, index) => (
          <group key={index}>
            <Line
              points={arc.points}
              color={config.color}
              transparent
              opacity={quiet ? arc.opacity * 0.18 : arc.opacity * (hovered || selected ? 1.6 : 0.74)}
              lineWidth={0.48}
              depthTest
              depthWrite
            />
            <Line
              points={arc.points}
              color={config.color}
              transparent
              opacity={quiet ? 0.003 : arc.opacity * (hovered || selected ? 0.14 : 0.075)}
              lineWidth={1.45}
              depthTest
              depthWrite={false}
            />
          </group>
        ))}
        <group ref={planetAnchorRef} scale={config.planetScale}>
          <DreamForm
            colorA={config.planetColor}
            colorB={config.color}
            deformation={0.235}
            glow={quiet ? 0.1 : hovered || selected ? 1 : 0.48}
            reducedMotion={reducedMotion}
          />
          <pointLight color={config.planetColor} intensity={quiet ? 0.08 : hovered || selected ? 1.8 : 0.72} distance={1.35} />
        </group>
        <points geometry={orbitDust}>
          <pointsMaterial
            color={config.color}
            size={0.024}
            transparent
            opacity={quiet ? 0.04 : hovered || selected ? 0.42 : 0.2}
            depthTest
            depthWrite={false}
            blending={AdditiveBlending}
            sizeAttenuation
          />
        </points>
      </group>

      <points geometry={particles} position={[0, 0, 0.16]}>
        <pointsMaterial
          color={config.color}
          size={0.018}
          transparent
          opacity={quiet ? 0.04 : 0.2}
          depthWrite={false}
          blending={AdditiveBlending}
          sizeAttenuation
        />
      </points>

      <Html center position={config.labelPosition} distanceFactor={8} zIndexRange={[12, 0]} style={{ pointerEvents: "none" }}>
        <div className={`field-label${quiet ? " is-quiet" : ""}${dragging ? " is-dragging" : ""}`}>
          <span>{config.labelLead}</span>
          <strong style={{ color: config.color }}>{config.emphasis}</strong>
        </div>
      </Html>
    </group>
  );
}
