import { Html } from "@react-three/drei";
import { type ThreeEvent, useFrame } from "@react-three/fiber";
import { easing } from "maath";
import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { fieldConfigs, fieldsById } from "./fieldConfig";
import { ReflectionNode } from "./ReflectionNode";
import type { CenterAnalysis, FieldConfig, FieldId, FieldReflections, Reflection } from "./types";

function EnergyPoint({ reflection, index, config }: { reflection: Reflection; index: number; config: FieldConfig }) {
  const groupRef = useRef<Group>(null);
  const base = useMemo(() => {
    const length = Math.hypot(config.orbitPosition[0], config.orbitPosition[1]) || 1;
    const directionX = config.orbitPosition[0] / length;
    const directionY = config.orbitPosition[1] / length;
    const tangentX = -directionY;
    const tangentY = directionX;
    const spread = ((index % 5) - 2) * 0.18;
    return new Vector3(directionX * 0.3 + tangentX * spread, directionY * 0.3 + tangentY * spread, (reflection.positionSeed - 0.5) * 0.12);
  }, [config.orbitPosition, index, reflection.positionSeed]);
  const phase = useMemo(() => index * 1.73 + reflection.createdAt * 0.00001, [index, reflection.createdAt]);

  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 0.72 + phase) * 0.12);
  });

  return (
    <group ref={groupRef} position={base}>
      <mesh>
        <sphereGeometry args={[0.018, 16, 16]} />
        <meshBasicMaterial color={config.color} toneMapped={false} />
      </mesh>
      <mesh scale={3.4}>
        <sphereGeometry args={[0.018, 12, 12]} />
        <meshBasicMaterial color={config.haloColor} transparent opacity={0.11} depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
      </mesh>
    </group>
  );
}

interface FieldProps {
  config: FieldConfig;
  reflections: Reflection[];
  selected: boolean;
  focusActive: boolean;
  labelsVisible: boolean;
  selectedNodeId: string | null;
  onHover: (id: string | null) => void;
  onSelectNode: (id: string) => void;
  onFocusField: (id: FieldId) => void;
  pendingReflectionId: string | null;
  onPendingScreenPosition: (x: number, y: number) => void;
  guideActive: boolean;
}

function Field({ config, reflections, selected, focusActive, labelsVisible, selectedNodeId, onHover, onSelectNode, onFocusField, pendingReflectionId, onPendingScreenPosition, guideActive, compact }: FieldProps & { compact: boolean }) {
  const groupRef = useRef<Group>(null);
  const pointerDown = useMemo(() => new Vector2(), []);
  const home = useMemo(() => new Vector3(...config.orbitPosition), [config.orbitPosition]);
  const focusTarget = useMemo(() => new Vector3(-0.42, 0.08, 0.42), []);
  const recededTarget = useMemo(() => new Vector3(config.orbitPosition[0] * 1.45, config.orbitPosition[1] * 1.45 - 0.12, -3.4), [config.orbitPosition]);
  const scaleTarget = useMemo(() => new Vector3(), []);
  const positionTarget = useMemo(() => new Vector3(), []);
  const planetPosition = useMemo(() => new Vector3(5, 5, 5), []);
  const trackPlanet = useCallback((position: Vector3) => planetPosition.copy(position), [planetPosition]);
  const parameters = useMemo<LabParameters>(() => ({
    ...defaultLabParameters,
    orbitRadius: 1.18,
    orbitDepth: 0.5,
    orbitTiltX: config.orbitTilt[0],
    orbitTiltY: config.orbitTilt[1],
    orbitCoreOpacity: config.id === "love" ? 0.34 : 0.22,
    orbitGlowOpacity: config.id === "love" ? 0.035 : 0.02,
    planetEnergyStrength: config.id === "love" ? 0.9 : 0.58,
    planetHaloIntensity: config.id === "love" ? 0.18 : 0.1,
  }), [config]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    positionTarget.copy(!focusActive ? home : selected ? focusTarget : recededTarget);
    scaleTarget.setScalar(!focusActive ? 1 : selected ? compact ? 1.68 : 2.02 : 0.025);
    easing.damp3(groupRef.current.position, positionTarget, 0.92, delta);
    easing.damp3(groupRef.current.scale, scaleTarget, 0.92, delta);
  });

  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    pointerDown.set(event.clientX, event.clientY);
  };
  const handlePointerUp = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    const dx = event.clientX - pointerDown.x;
    const dy = event.clientY - pointerDown.y;
    if (dx * dx + dy * dy < 25) onFocusField(config.id);
  };
  const visibleReflections = reflections.slice(-8);
  const guideDelay = `${fieldConfigs.findIndex((field) => field.id === config.id) * 0.62}s`;

  return (
    <group ref={groupRef} position={config.orbitPosition}>
      <LocusOrbit parameters={parameters} initialProgress={config.orbitProgress} onPlanetPosition={trackPlanet} />
      <Html center position={[0, 0, 0.38]} distanceFactor={focusActive && selected ? compact ? 4.7 : 5.8 : 4.8} style={{ pointerEvents: "none" }}>
        <div className={`alpha-field-label${focusActive && selected ? " is-focused" : ""}${focusActive && !selected ? " is-receded" : ""}${guideActive ? " is-guided" : ""}`} style={{ "--guide-delay": guideDelay } as CSSProperties}>
          <span>{config.lead}</span>
          <strong style={{ color: config.color }}>{config.emphasis}</strong>
        </div>
      </Html>
      <mesh onPointerDown={handlePointerDown} onPointerUp={handlePointerUp}>
        <sphereGeometry args={[1.02, 24, 24]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
      <group position={[0, 0, 0.32]} rotation={[config.orbitTilt[0], config.orbitTilt[1], 0.09]}>
        {visibleReflections.map((reflection, index) => selected && (labelsVisible || reflection.id === pendingReflectionId) ? (
          <ReflectionNode key={reflection.id} reflection={reflection} config={config} index={index} selected={reflection.id === selectedNodeId} onHover={onHover} onSelect={onSelectNode} planetPosition={planetPosition} pending={reflection.id === pendingReflectionId} onPendingScreenPosition={onPendingScreenPosition} compact={compact} />
        ) : (
          <EnergyPoint key={reflection.id} reflection={reflection} index={index} config={config} />
        ))}
      </group>
    </group>
  );
}

function ResponsiveCenter({ analysis, pulseVersion, focused, onSelectCenter }: { analysis: CenterAnalysis; pulseVersion: number; focused: boolean; onSelectCenter: () => void }) {
  const groupRef = useRef<Group>(null);
  const pointerDown = useMemo(() => new Vector2(), []);
  const pulseStart = useRef(-10);
  const seenPulse = useRef(pulseVersion);
  const parameters = useMemo(() => ({
    ...defaultLabParameters,
    centerScale: 0.82,
    centerEnergyStrength: 0.58 + analysis.density * 0.34 + analysis.overlap * 0.2,
    centerHaloIntensity: 0.1 + analysis.coverage * 0.08 + analysis.overlap * 0.12,
  }), [analysis]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    if (seenPulse.current !== pulseVersion) {
      seenPulse.current = pulseVersion;
      pulseStart.current = state.clock.elapsedTime;
    }
    const age = state.clock.elapsedTime - pulseStart.current;
    const pulse = age >= 0 ? Math.sin(age * 9) * Math.exp(-age * 4.2) * 0.08 : 0;
    easing.damp(groupRef.current.position, "z", focused ? -3.2 : 0.48, 0.92, delta);
    const scale = (focused ? 0.045 : 1) + pulse;
    easing.damp(groupRef.current.scale, "x", scale, 0.92, delta);
    easing.damp(groupRef.current.scale, "y", scale, 0.92, delta);
    easing.damp(groupRef.current.scale, "z", scale, 0.92, delta);
  });

  return (
    <group ref={groupRef} position={[0, 0, 0.48]}>
      <CenterSpecimen parameters={parameters} />
      <mesh
        onPointerDown={(event) => {
          event.stopPropagation();
          pointerDown.set(event.clientX, event.clientY);
        }}
        onPointerUp={(event) => {
          event.stopPropagation();
          const dx = event.clientX - pointerDown.x;
          const dy = event.clientY - pointerDown.y;
          if (dx * dx + dy * dy < 25 && !focused) onSelectCenter();
        }}
      >
        <sphereGeometry args={[0.66, 24, 24]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
      <Html center position={[0, 0, 0.8]} distanceFactor={5} style={{ pointerEvents: "none" }}>
        <div className={`alpha-center-label${focused ? " is-receded" : ""}`}><span>Your</span><strong>IKIGAI</strong></div>
      </Html>
    </group>
  );
}

interface IkigaiAlphaSceneProps {
  reflections: FieldReflections;
  analysis: CenterAnalysis;
  pulseVersion: number;
  resetVersion: number;
  focusedFieldId: FieldId | null;
  labelsVisible: boolean;
  selectedNodeId: string | null;
  onHover: (id: string | null) => void;
  onSelectNode: (id: string) => void;
  onFocusField: (id: FieldId) => void;
  onSelectCenter: () => void;
  onDraggingChange: (dragging: boolean) => void;
  pendingReflectionId: string | null;
  onPendingScreenPosition: (x: number, y: number) => void;
  guideActive: boolean;
}

export function IkigaiAlphaScene({ reflections, analysis, pulseVersion, resetVersion, focusedFieldId, labelsVisible, selectedNodeId, onHover, onSelectNode, onFocusField, onSelectCenter, onDraggingChange, pendingReflectionId, onPendingScreenPosition, guideActive }: IkigaiAlphaSceneProps) {
  const [compact, setCompact] = useState(() => window.matchMedia("(max-width: 800px)").matches);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 800px)");
    const update = () => setCompact(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const sceneParameters = useMemo(() => ({ ...defaultLabParameters, fov: compact ? 38 : 35, cameraDistance: 6.4, bloom: compact ? 0.16 : 0.22, backgroundHaze: compact ? 0.34 : 0.42 }), [compact]);
  const focusedConfig = focusedFieldId ? fieldsById[focusedFieldId] : null;
  const cameraFocus = useMemo(() => {
    if (!focusedConfig) return null;
    const position: [number, number, number] = compact
      ? [focusedConfig.focusCameraPosition[0], focusedConfig.focusCameraPosition[1], 6.25]
      : focusedConfig.focusCameraPosition;
    return { position, target: focusedConfig.focusCameraTarget };
  }, [compact, focusedConfig]);

  return (
    <LocusCanvas className="alpha-canvas" parameters={sceneParameters} resetVersion={resetVersion} cameraFocus={cameraFocus}>
      <InertialUniverse resetVersion={resetVersion} position={[-0.55, 0, 0]} onDraggingChange={onDraggingChange} renderBackdrop={(yaw, pitch) => <CosmicBackground parameters={sceneParameters} yaw={yaw} pitch={pitch} />}>
        <group scale={0.72}>
          {fieldConfigs.map((config) => <Field key={config.id} config={config} reflections={reflections[config.id]} selected={focusedFieldId === config.id} focusActive={focusedFieldId !== null} labelsVisible={labelsVisible} selectedNodeId={selectedNodeId} onHover={onHover} onSelectNode={onSelectNode} onFocusField={onFocusField} pendingReflectionId={pendingReflectionId} onPendingScreenPosition={onPendingScreenPosition} guideActive={guideActive} compact={compact} />)}
          <ResponsiveCenter analysis={analysis} pulseVersion={pulseVersion} focused={focusedFieldId !== null} onSelectCenter={onSelectCenter} />
        </group>
      </InertialUniverse>
    </LocusCanvas>
  );
}
