import { Html } from "@react-three/drei";
import { type ThreeEvent, useFrame } from "@react-three/fiber";
import { easing } from "maath";
import { useMemo, useRef } from "react";
import { AdditiveBlending, Group, Vector2, Vector3 } from "three";
import {
  CenterSpecimen,
  CosmicBackground,
  defaultLabParameters,
  InertialUniverse,
  LocusCanvas,
  LocusOrbit,
  type LabParameters,
} from "../locus-core";
import { ReflectionNode } from "./ReflectionNode";
import { reflectionPosition } from "./reflectionPosition";
import type { LoveReflection } from "./types";

const fields = [
  { id: "love", position: [0, 1.02, 0.04] as [number, number, number], lead: "What you", emphasis: "LOVE", progress: 0.25, tilt: [0.34, -0.12], color: "#ab7dff" },
  { id: "ability", position: [-1.02, 0, 0.1] as [number, number, number], lead: "What you’re", emphasis: "GOOD AT", progress: 0.5, tilt: [0.22, 0.18], color: "#78a9ef" },
  { id: "meaning", position: [1.02, 0, -0.08] as [number, number, number], lead: "What the", emphasis: "WORLD NEEDS", progress: 0, tilt: [-0.26, -0.16], color: "#77cfb9" },
  { id: "paid", position: [0, -1.02, -0.02] as [number, number, number], lead: "What you can be", emphasis: "PAID FOR", progress: 0.75, tilt: [-0.32, 0.14], color: "#d9a06f" },
] as const;

function EnergyPoint({ reflection, index }: { reflection: LoveReflection; index: number }) {
  const groupRef = useRef<Group>(null);
  const base = useMemo(() => reflectionPosition(reflection, index), [index, reflection]);
  const phase = useMemo(() => index * 1.73 + reflection.createdAt * 0.00001, [index, reflection.createdAt]);

  useFrame((state) => {
    if (!groupRef.current) return;
    const breath = 1 + Math.sin(state.clock.elapsedTime * 0.72 + phase) * 0.12;
    groupRef.current.scale.setScalar(breath);
  });

  return (
    <group ref={groupRef} position={base}>
      <mesh>
        <sphereGeometry args={[0.018, 16, 16]} />
        <meshBasicMaterial color="#d4baff" toneMapped={false} />
      </mesh>
      <mesh scale={3.4}>
        <sphereGeometry args={[0.018, 12, 12]} />
        <meshBasicMaterial color="#9d62ed" transparent opacity={0.11} depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
      </mesh>
    </group>
  );
}

interface FieldProps {
  field: (typeof fields)[number];
  reflections: LoveReflection[];
  focused: boolean;
  focusActive: boolean;
  labelsVisible: boolean;
  selectedId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  onFocusLove: () => void;
}

function Field({ field, reflections, focused, focusActive, labelsVisible, selectedId, onHover, onSelect, onFocusLove }: FieldProps) {
  const groupRef = useRef<Group>(null);
  const pointerDown = useMemo(() => new Vector2(), []);
  const home = useMemo(() => new Vector3(...field.position), [field.position]);
  const focusTarget = useMemo(() => new Vector3(0, 0.08, 0.42), []);
  const recededTarget = useMemo(() => new Vector3(field.position[0] * 1.45, field.position[1] * 1.45 - 0.12, -3.4), [field.position]);
  const scaleTarget = useMemo(() => new Vector3(), []);
  const positionTarget = useMemo(() => new Vector3(), []);
  const parameters = useMemo<LabParameters>(() => ({
    ...defaultLabParameters,
    orbitRadius: 1.18,
    orbitDepth: 0.5,
    orbitTiltX: field.tilt[0],
    orbitTiltY: field.tilt[1],
    orbitCoreOpacity: field.id === "love" ? 0.34 : 0.22,
    orbitGlowOpacity: field.id === "love" ? 0.035 : 0.02,
    planetEnergyStrength: field.id === "love" ? 0.9 : 0.58,
    planetHaloIntensity: field.id === "love" ? 0.18 : 0.1,
  }), [field]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    positionTarget.copy(!focusActive ? home : focused ? focusTarget : recededTarget);
    const scale = !focusActive ? 1 : focused ? 2.25 : 0.025;
    scaleTarget.setScalar(scale);
    easing.damp3(groupRef.current.position, positionTarget, 0.72, delta);
    easing.damp3(groupRef.current.scale, scaleTarget, 0.72, delta);
  });

  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
    pointerDown.set(event.clientX, event.clientY);
  };
  const handlePointerUp = (event: ThreeEvent<PointerEvent>) => {
    const dx = event.clientX - pointerDown.x;
    const dy = event.clientY - pointerDown.y;
    if (dx * dx + dy * dy < 25) onFocusLove();
  };

  const visibleReflections = reflections.slice(-8);

  return (
    <group ref={groupRef} position={field.position}>
      <LocusOrbit parameters={parameters} initialProgress={field.progress} />
      <Html center position={[0, 0, 0.38]} distanceFactor={8} style={{ pointerEvents: "none" }}>
        <div className={`alpha-field-label${field.id !== "love" ? " is-placeholder" : ""}${focusActive && !focused ? " is-receded" : ""}`}>
          <span>{field.lead}</span>
          <strong style={{ color: field.color }}>{field.emphasis}</strong>
        </div>
      </Html>
      {field.id === "love" ? (
        <>
          <mesh onPointerDown={handlePointerDown} onPointerUp={handlePointerUp}>
            <sphereGeometry args={[1.02, 24, 24]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
          </mesh>
          <group position={[0, 0, 0.32]}>
            {visibleReflections.map((reflection, index) => focused && labelsVisible ? (
              <ReflectionNode key={reflection.id} reflection={reflection} index={index} selected={reflection.id === selectedId} onHover={onHover} onSelect={onSelect} />
            ) : (
              <EnergyPoint key={reflection.id} reflection={reflection} index={index} />
            ))}
          </group>
        </>
      ) : null}
    </group>
  );
}

function ResponsiveCenter({ count, pulseVersion, focused }: { count: number; pulseVersion: number; focused: boolean }) {
  const groupRef = useRef<Group>(null);
  const pulseStart = useRef(-10);
  const seenPulse = useRef(pulseVersion);
  const parameters = useMemo(() => ({ ...defaultLabParameters, centerScale: 0.82, centerEnergyStrength: 0.65 + Math.min(count, 8) * 0.05, centerHaloIntensity: 0.13 + Math.min(count, 8) * 0.024 }), [count]);
  useFrame((state, delta) => {
    if (!groupRef.current) return;
    if (seenPulse.current !== pulseVersion) {
      seenPulse.current = pulseVersion;
      pulseStart.current = state.clock.elapsedTime;
    }
    const age = state.clock.elapsedTime - pulseStart.current;
    const pulse = age >= 0 ? Math.sin(age * 9) * Math.exp(-age * 4.2) * 0.08 : 0;
    easing.damp(groupRef.current.position, "z", focused ? -3.2 : 0.48, 0.92, delta);
    easing.damp(groupRef.current.scale, "x", (focused ? 0.045 : 1) + pulse, 0.92, delta);
    easing.damp(groupRef.current.scale, "y", (focused ? 0.045 : 1) + pulse, 0.92, delta);
    easing.damp(groupRef.current.scale, "z", (focused ? 0.045 : 1) + pulse, 0.92, delta);
  });
  return <group ref={groupRef} position={[0, 0, 0.48]}><CenterSpecimen parameters={parameters} /><Html center position={[0, 0, 0.8]} distanceFactor={8} style={{ pointerEvents: "none" }}><div className={`alpha-center-label${focused ? " is-receded" : ""}`}><span>Your</span><strong>IKIGAI</strong></div></Html></group>;
}

interface IkigaiAlphaSceneProps {
  reflections: LoveReflection[];
  pulseVersion: number;
  resetVersion: number;
  loveFocused: boolean;
  loveLabelsVisible: boolean;
  selectedId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  onFocusLove: () => void;
  onDraggingChange: (dragging: boolean) => void;
}

export function IkigaiAlphaScene({ reflections, pulseVersion, resetVersion, loveFocused, loveLabelsVisible, selectedId, onHover, onSelect, onFocusLove, onDraggingChange }: IkigaiAlphaSceneProps) {
  const sceneParameters = useMemo(() => ({ ...defaultLabParameters, fov: 35, cameraDistance: 6.4, bloom: 0.22, backgroundHaze: 0.42 }), []);
  return (
    <LocusCanvas className="alpha-canvas" parameters={sceneParameters} resetVersion={resetVersion} cameraFocus={loveFocused}>
      <InertialUniverse resetVersion={resetVersion} position={[-0.55, 0, 0]} onDraggingChange={onDraggingChange} renderBackdrop={(yaw, pitch) => <CosmicBackground parameters={sceneParameters} yaw={yaw} pitch={pitch} />}>
        <group scale={0.72}>
          {fields.map((field) => <Field key={field.id} field={field} reflections={reflections} focused={loveFocused && field.id === "love"} focusActive={loveFocused} labelsVisible={loveLabelsVisible} selectedId={selectedId} onHover={onHover} onSelect={onSelect} onFocusLove={onFocusLove} />)}
          <ResponsiveCenter count={reflections.length} pulseVersion={pulseVersion} focused={loveFocused} />
        </group>
      </InertialUniverse>
    </LocusCanvas>
  );
}
