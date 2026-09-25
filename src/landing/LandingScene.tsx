import { Html } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { easing } from "maath";
import { type CSSProperties, type MutableRefObject, useMemo, useRef } from "react";
import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  Group,
  PerspectiveCamera,
  SRGBColorSpace,
  Vector3,
} from "three";
import { CenterSpecimen, CosmicBackground, defaultLabParameters, LocusOrbit, type LabParameters } from "../locus-core";
import { fieldConfigs } from "../ikigai-alpha/fieldConfig";
import type { FieldConfig } from "../ikigai-alpha/types";

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function ease(value: number) {
  const x = clamp(value);
  return x * x * (3 - 2 * x);
}

const worldEntryOffsets: [number, number, number][] = [
  [0.1, 1.55, -0.9],
  [-1.75, 0.12, 0.65],
  [1.75, 0.15, -0.7],
  [0.18, -0.42, 0.55],
];

const worldAssemblyStarts = [0.124, 0.138, 0.152, 0.152];

const worldEntryRotations: [number, number, number][] = [
  [-0.18, 0.12, -0.08],
  [0.08, -0.2, 0.13],
  [-0.1, 0.22, -0.12],
  [0.18, -0.1, 0.09],
];

function openingStrength(progress: number) {
  return 1 - ease((progress - 0.11) / 0.025);
}

function fieldAssemblyStrength(progress: number, index: number) {
  return ease((progress - worldAssemblyStarts[index]) / 0.04);
}

function LandingCamera({ progress, entering }: { progress: number; entering: boolean }) {
  const camera = useThree((state) => state.camera as PerspectiveCamera);
  const target = useMemo(() => new Vector3(), []);
  useFrame((state, delta) => {
    const ready = ease((progress - 0.76) / 0.2);
    const enter = entering ? 1 : 0;
    target.set(state.pointer.x * 0.08 * (1 - ready), 0.12 + state.pointer.y * 0.045 * (1 - ready), 6.9 - ready * 0.55 - enter * 3.8);
    easing.damp3(camera.position, target, entering ? 0.72 : 1.2, delta);
    camera.lookAt(0, 0.02, 0);
  });
  return null;
}

function World({ config, index, progress }: { config: FieldConfig; index: number; progress: number }) {
  const groupRef = useRef<Group>(null);
  const home = useMemo(() => new Vector3(...config.orbitPosition), [config.orbitPosition]);
  const entryOffset = useMemo(() => new Vector3(...worldEntryOffsets[index]), [index]);
  const positionTarget = useMemo(() => new Vector3(), []);
  const scaleTarget = useMemo(() => new Vector3(1, 1, 1), []);
  const parameters = useMemo<LabParameters>(() => ({
    ...defaultLabParameters,
    orbitRadius: 1.18,
    orbitDepth: 0.5,
    orbitTiltX: config.orbitTilt[0],
    orbitTiltY: config.orbitTilt[1],
    orbitCoreOpacity: 0.23,
    orbitGlowOpacity: 0.022,
    planetEnergyStrength: 0.68,
    planetHaloIntensity: 0.12,
  }), [config]);
  const labelVisibility = Math.max(
    openingStrength(progress),
    ease((fieldAssemblyStrength(progress, index) - 0.32) / 0.58),
  );

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const opening = openingStrength(progress);
    const assembly = fieldAssemblyStrength(progress, index);
    const assembling = assembly > opening;
    const convergence = ease((progress - 0.205) / 0.065);
    const visibility = Math.max(opening, assembly);
    const entryRotation = worldEntryRotations[index];

    if (assembling) positionTarget.copy(home).multiplyScalar(1.12 - convergence * 0.12).addScaledVector(entryOffset, 1 - assembly);
    else positionTarget.copy(home);

    scaleTarget.setScalar(assembling ? 0.42 + assembly * 0.58 : opening);
    groupRef.current.visible = visibility > 0.012;
    easing.damp3(groupRef.current.position, positionTarget, 0.72, delta);
    easing.damp3(groupRef.current.scale, scaleTarget, 0.72, delta);
    easing.damp(groupRef.current.rotation, "x", assembling ? entryRotation[0] * (1 - assembly) : 0, 0.75, delta);
    easing.damp(groupRef.current.rotation, "y", assembling ? entryRotation[1] * (1 - assembly) : 0, 0.75, delta);
    easing.damp(groupRef.current.rotation, "z", assembling ? entryRotation[2] * (1 - assembly) : 0, 0.75, delta);
  });

  return (
    <group ref={groupRef} position={home}>
      <LocusOrbit parameters={parameters} initialProgress={config.orbitProgress} />
      <Html center position={[0, 0, 0.38]} distanceFactor={5.2} style={{ pointerEvents: "none", opacity: labelVisibility }}>
        <div className="landing-field-label">
          <span>{config.lead}</span>
          <strong style={{ color: config.color }}>{config.emphasis}</strong>
        </div>
      </Html>
    </group>
  );
}

interface ExampleReflectionConfig {
  start: number;
  fieldIndex: number;
  label: string;
  compactLabel: string;
  localTarget: [number, number, number];
}

const exampleReflections: ExampleReflectionConfig[] = [
  { start: 0.455, fieldIndex: 1, label: "Making complicated things feel simple", compactLabel: "Making things clear", localTarget: [-0.52, -0.16, 0.26] },
  { start: 0.53, fieldIndex: 2, label: "Helping people feel less lost", compactLabel: "Helping people", localTarget: [0.18, -0.2, 0.2] },
  { start: 0.605, fieldIndex: 0, label: "Building beautiful things", compactLabel: "Building beautifully", localTarget: [0.28, 0.08, 0.16] },
];

function ExampleReflection({ reflection, progress, mobile }: { reflection: ExampleReflectionConfig; progress: number; mobile: boolean }) {
  const finalRef = useRef<Group>(null);
  const config = fieldConfigs[reflection.fieldIndex];
  const target = useMemo(() => new Vector3(...config.orbitPosition).add(new Vector3(...reflection.localTarget)), [config.orbitPosition, reflection.localTarget]);
  const reveal = ease((progress - reflection.start) / 0.045);
  const labelOpacity = mobile ? reveal * (1 - ease((progress - 0.675) / 0.035)) : reveal;

  useFrame((_, delta) => {
    if (finalRef.current) {
      easing.damp(finalRef.current.scale, "x", reveal, 0.62, delta);
      easing.damp(finalRef.current.scale, "y", reveal, 0.62, delta);
      easing.damp(finalRef.current.scale, "z", reveal, 0.62, delta);
      finalRef.current.position.y = target.y + Math.sin(progress * 18 + reflection.fieldIndex) * 0.025;
    }
  });

  return (
    <group ref={finalRef} position={target} scale={0.001}>
      <mesh><sphereGeometry args={[0.021, 16, 16]} /><meshBasicMaterial color={config.color} toneMapped={false} /></mesh>
      <mesh scale={3.4}><sphereGeometry args={[0.021, 14, 14]} /><meshBasicMaterial color={config.haloColor} transparent opacity={0.1} depthWrite={false} blending={AdditiveBlending} toneMapped={false} /></mesh>
      <Html position={[0.04, 0.01, 0]} distanceFactor={6} style={{ pointerEvents: "none", opacity: labelOpacity }}><span className={`landing-reflection-label${mobile && reflection.fieldIndex === 2 ? " is-inward" : ""}`} style={{ "--signal-color": config.color } as CSSProperties}>{mobile ? reflection.compactLabel : reflection.label}</span></Html>
    </group>
  );
}

function EmergingSignals({ progress }: { progress: number }) {
  const opacity = ease((progress - 0.66) / 0.055) * (1 - ease((progress - 0.78) / 0.05));
  return (
    <group position={[0, 0, 1.05]}>
      {[
        ["Builder", -0.92, 0.54, "#ab7dff"],
        ["Translator", 0.88, 0.42, "#77cfb9"],
        ["Clarity", -0.76, -0.55, "#78a9ef"],
        ["Helping others", 0.72, -0.58, "#d9a06f"],
      ].map(([label, x, y, color]) => (
        <Html key={String(label)} center position={[Number(x), Number(y), 0]} distanceFactor={6} style={{ pointerEvents: "none", opacity }}>
          <span className="landing-signal" style={{ "--signal-color": color } as CSSProperties}>{label}</span>
        </Html>
      ))}
    </group>
  );
}

function SceneContent({ progress, entering, mobile }: { progress: number; entering: boolean; mobile: boolean }) {
  const universeRef = useRef<Group>(null);
  const centerRef = useRef<Group>(null);
  const yaw = useRef(0) as MutableRefObject<number>;
  const pitch = useRef(0) as MutableRefObject<number>;
  const universePositionTarget = useMemo(() => new Vector3(), []);
  const centerScaleTarget = useMemo(() => new Vector3(1, 1, 1), []);
  const exampleEnergy = exampleReflections.reduce((count, reflection) => count + ease((progress - reflection.start) / 0.045), 0);
  const introPulse = Math.sin(Math.PI * clamp((progress - 0.215) / 0.09));
  const centerParameters = useMemo<LabParameters>(() => ({
    ...defaultLabParameters,
    centerScale: 0.78 + exampleEnergy * 0.035 + introPulse * 0.07,
    centerShellOpacity: 0.18 + exampleEnergy * 0.025 + introPulse * 0.025,
    centerEnergyStrength: 0.48 + exampleEnergy * 0.12 + introPulse * 0.14,
    centerHaloIntensity: 0.07 + exampleEnergy * 0.035 + introPulse * 0.055,
  }), [exampleEnergy, introPulse]);
  const backdropParameters = useMemo(() => ({ ...defaultLabParameters, backgroundHaze: 0.31 + progress * 0.12 }), [progress]);
  const centerLabelVisibility = Math.max(
    openingStrength(progress),
    ease((ease((progress - 0.215) / 0.055) - 0.32) / 0.5),
  );

  useFrame((state, delta) => {
    if (!universeRef.current) return;
    const ready = ease((progress - 0.76) / 0.18);
    const conceptFocus = mobile
      ? ease((progress - 0.065) / 0.075) * (1 - ease((progress - 0.235) / 0.07))
      : 0;
    const targetScale = (mobile ? 0.46 + conceptFocus * 0.03 : 0.73) + ready * 0.04 + (entering ? 0.58 : 0);
    easing.damp(universeRef.current.scale, "x", targetScale, entering ? 0.65 : 1.1, delta);
    easing.damp(universeRef.current.scale, "y", targetScale, entering ? 0.65 : 1.1, delta);
    easing.damp(universeRef.current.scale, "z", targetScale, entering ? 0.65 : 1.1, delta);
    universePositionTarget.set(mobile ? 0 : 0.78, mobile ? 0.58 - conceptFocus * 0.08 : 0, 0);
    easing.damp3(universeRef.current.position, universePositionTarget, 0.9, delta);
    easing.damp(universeRef.current.rotation, "y", state.pointer.x * 0.055 * (1 - ready), 0.9, delta);
    easing.damp(universeRef.current.rotation, "x", -state.pointer.y * 0.035 * (1 - ready), 0.9, delta);
    yaw.current = universeRef.current.rotation.y;
    pitch.current = universeRef.current.rotation.x;

    if (centerRef.current) {
      const centerReveal = ease((progress - 0.215) / 0.055);
      const visibility = Math.max(openingStrength(progress), centerReveal);
      centerScaleTarget.setScalar(visibility);
      centerRef.current.visible = visibility > 0.012;
      easing.damp3(centerRef.current.scale, centerScaleTarget, 0.78, delta);
    }
  });

  return (
    <>
      <CosmicBackground parameters={backdropParameters} yaw={yaw} pitch={pitch} />
      <group ref={universeRef} position={[mobile ? 0 : 0.78, mobile ? 0.58 : 0, 0]} scale={mobile ? 0.46 : 0.73}>
        {fieldConfigs.map((config, index) => <World key={config.id} config={config} index={index} progress={progress} />)}
        <group ref={centerRef}>
          <CenterSpecimen parameters={centerParameters} />
          <Html center position={[0, 0, 0.82]} distanceFactor={5.2} style={{ pointerEvents: "none", opacity: centerLabelVisibility }}>
            <div className="landing-center-label"><span>Your</span><strong>IKIGAI</strong></div>
          </Html>
        </group>
        {exampleReflections.map((reflection) => <ExampleReflection key={reflection.label} reflection={reflection} progress={progress} mobile={mobile} />)}
        <EmergingSignals progress={progress} />
      </group>
      <LandingCamera progress={progress} entering={entering} />
    </>
  );
}

export function LandingScene({ progress, entering, reducedMotion, mobile }: { progress: number; entering: boolean; reducedMotion: boolean; mobile: boolean }) {
  const renderedProgress = progress;
  const bloomIntensity = reducedMotion ? 0.12 : mobile ? 0.15 : 0.2;
  return (
    <div className="landing-scene" aria-hidden="true">
      <Canvas dpr={mobile ? [1, 1.35] : [1, 2]} gl={{ antialias: true, alpha: false, powerPreference: "high-performance", outputColorSpace: SRGBColorSpace, toneMapping: ACESFilmicToneMapping, toneMappingExposure: 0.9 }} camera={{ position: [0, 0.12, 6.9], fov: 35, near: 0.1, far: 80 }}>
        <color attach="background" args={["#010207"]} />
        <ambientLight intensity={0.07} />
        <directionalLight position={[-4, 5, 6]} intensity={0.58} color="#c7f5ff" />
        <directionalLight position={[4, -2, 2]} intensity={0.22} color="#654bd4" />
        <SceneContent progress={renderedProgress} entering={entering} mobile={mobile} />
        <EffectComposer multisampling={0}><Bloom intensity={bloomIntensity} luminanceThreshold={0.84} luminanceSmoothing={0.1} mipmapBlur /></EffectComposer>
      </Canvas>
    </div>
  );
}
