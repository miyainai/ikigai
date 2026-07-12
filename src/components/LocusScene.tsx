import { OrbitControls, Stars } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { easing } from "maath";
import { useEffect, useMemo, useRef, useState } from "react";
import { ACESFilmicToneMapping, SRGBColorSpace, Vector3 } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { fields, type RegionId } from "../data/regions";
import { CosmicBackdrop } from "./CosmicBackdrop";
import { UniverseRig } from "./UniverseRig";

function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return reducedMotion;
}

interface LocusSceneProps {
  hoveredRegion: RegionId | null;
  selectedRegion: RegionId | null;
  onHover: (region: RegionId | null) => void;
  onSelect: (region: RegionId) => void;
  onClear: () => void;
  resetVersion: number;
}

function SceneContent(props: LocusSceneProps) {
  const reducedMotion = useReducedMotion();

  return (
    <>
      <color attach="background" args={["#030609"]} />
      <CosmicBackdrop />
      <ambientLight intensity={0.16} />
      <directionalLight position={[-3, 4, 6]} intensity={0.9} color="#dff8fa" />
      <directionalLight position={[4, -1, -3]} intensity={0.22} color="#727bea" />
      <Stars radius={34} depth={18} count={180} factor={1.05} saturation={0.1} fade speed={0} />
      <Stars radius={16} depth={8} count={54} factor={0.72} saturation={0.18} fade speed={0} />
      <UniverseRig
        reducedMotion={reducedMotion}
        hoveredRegion={props.hoveredRegion}
        selectedRegion={props.selectedRegion}
        onHover={props.onHover}
        onSelect={props.onSelect}
        resetVersion={props.resetVersion}
      />

      <SceneControls selectedRegion={props.selectedRegion} resetVersion={props.resetVersion} />

      <EffectComposer multisampling={0}>
        <Bloom intensity={0.38} luminanceThreshold={0.78} luminanceSmoothing={0.14} mipmapBlur />
      </EffectComposer>
    </>
  );
}

interface SceneControlsProps {
  selectedRegion: RegionId | null;
  resetVersion: number;
}

function SceneControls({ selectedRegion, resetVersion }: SceneControlsProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const previousSelection = useRef<RegionId | null>(null);
  const returning = useRef(false);
  const { camera, width } = useThree((state) => ({ camera: state.camera, width: state.size.width }));
  const defaultPosition = useMemo(() => new Vector3(0, 0.22, 8), []);
  const defaultTarget = useMemo(() => new Vector3(), []);
  const desiredPosition = useMemo(() => new Vector3(), []);
  const desiredTarget = useMemo(() => new Vector3(), []);

  useEffect(() => {
    returning.current = true;
  }, [resetVersion]);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;

    if (previousSelection.current && !selectedRegion) returning.current = true;
    previousSelection.current = selectedRegion;

    const mapX = width < 720 ? 0 : 0.78;
    defaultTarget.set(mapX, width < 720 ? 0.55 : 0, 0);

    if (selectedRegion) {
      const field = fields.find((item) => item.id === selectedRegion);
      const x = mapX + (field?.position[0] ?? 0) * (width < 720 ? 0.43 : 0.64);
      const y = (width < 720 ? 0.55 : 0) + (field?.position[1] ?? 0) * (width < 720 ? 0.43 : 0.64);
      desiredTarget.set(x, y, 0.15);
      desiredPosition.set(x, y, selectedRegion === "ikigai" ? 5.1 : 5.6);
      easing.damp3(camera.position, desiredPosition, 0.72, delta);
      easing.damp3(controls.target, desiredTarget, 0.72, delta);
    } else if (returning.current) {
      easing.damp3(camera.position, defaultPosition, 0.72, delta);
      easing.damp3(controls.target, defaultTarget, 0.72, delta);
      if (camera.position.distanceTo(defaultPosition) < 0.015 && controls.target.distanceTo(defaultTarget) < 0.015) {
        returning.current = false;
      }
    }

    controls.enabled = !selectedRegion && !returning.current;
    controls.update();
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.075}
      enablePan={false}
      enableRotate={false}
      minDistance={5.6}
      maxDistance={9.2}
      zoomSpeed={0.42}
      target={[width < 720 ? 0 : 0.78, width < 720 ? 0.55 : 0, 0]}
    />
  );
}

export function LocusScene(props: LocusSceneProps) {
  return (
    <div className="scene-frame" aria-hidden="true">
      <Canvas
        dpr={[1, 1.75]}
        camera={{ position: [0, 0.22, 8], fov: 35, near: 0.1, far: 60 }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
          outputColorSpace: SRGBColorSpace,
          toneMapping: ACESFilmicToneMapping,
          toneMappingExposure: 1.08,
        }}
        onPointerMissed={props.onClear}
      >
        <SceneContent {...props} />
      </Canvas>
    </div>
  );
}
