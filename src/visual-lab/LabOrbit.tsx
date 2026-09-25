import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  Group,
  MathUtils,
  MeshBasicMaterial,
  PointsMaterial,
  TubeGeometry,
  Vector3,
} from "three";
import { OuterPlanet } from "./OuterPlanet";
import type { LabParameters } from "./types";

interface LabOrbitProps { parameters: LabParameters; initialProgress?: number; onPlanetPosition?: (position: Vector3) => void; captureActive?: boolean; captureColor?: string; }

export function LabOrbit({ parameters, initialProgress=0.09, onPlanetPosition, captureActive=false, captureColor="#b89cff" }: LabOrbitProps) {
  const planetAnchor = useRef<Group>(null);
  const planetPoint = useMemo(() => new Vector3(), []);
  const curve = useMemo(() => {
    const points = Array.from({ length: 160 }, (_, index) => {
      const angle = (index / 160) * Math.PI * 2;
      const irregularity = 1 + Math.sin(angle * 3 + 0.7) * 0.018 + Math.sin(angle * 7) * 0.008;
      return new Vector3(
        Math.cos(angle) * parameters.orbitRadius * irregularity,
        Math.sin(angle) * parameters.orbitRadius * 0.62 * irregularity,
        Math.sin(angle + 0.35) * parameters.orbitDepth,
      );
    });
    return new CatmullRomCurve3(points, true, "centripetal");
  }, [parameters.orbitDepth, parameters.orbitRadius]);

  const segments = useMemo(() => Array.from({ length: 48 }, (_, index) => {
    const start = index / 48;
    const end = (index + 1) / 48;
    const segmentPoints = Array.from({ length: 7 }, (_, pointIndex) => curve.getPointAt(start + (end - start) * (pointIndex / 6)));
    const segmentCurve = new CatmullRomCurve3(segmentPoints, false, "centripetal");
    const midpoint = curve.getPointAt((start + end) * 0.5);
    const near = (midpoint.z / Math.max(parameters.orbitDepth, 0.001) + 1) * 0.5;
    const phase = (start + end) * Math.PI;
    const wave = Math.sin(phase * 2.2 + 0.8) * 0.5 + 0.5;
    const smoothWave = wave * wave * (3 - 2 * wave);
    const fadeShape = wave + (smoothWave - wave) * parameters.orbitFadeSmoothness;
    const fade = 1 - parameters.orbitFadeVariation * (0.28 + fadeShape * 0.72);
    const brightness = parameters.farBrightness + near * (parameters.nearBrightness - parameters.farBrightness);
    const coreOpacity = parameters.orbitCoreOpacity * brightness * fade;
    return {
      core: new TubeGeometry(segmentCurve, 7, parameters.orbitCoreWidth, 5, false),
      glow: new TubeGeometry(segmentCurve, 7, parameters.orbitGlowWidth, 5, false),
      coreOpacity,
      coreMaterial: new MeshBasicMaterial({ color: new Color("#62d2df"), transparent: true, opacity: coreOpacity, depthTest: true, depthWrite: true }),
      glowMaterial: new MeshBasicMaterial({ color: new Color("#4b62c7"), transparent: true, opacity: parameters.orbitGlowOpacity * brightness * fade, depthTest: true, depthWrite: false, blending: AdditiveBlending }),
    };
  }), [curve, parameters.farBrightness, parameters.nearBrightness, parameters.orbitCoreOpacity, parameters.orbitCoreWidth, parameters.orbitDepth, parameters.orbitFadeSmoothness, parameters.orbitFadeVariation, parameters.orbitGlowOpacity, parameters.orbitGlowWidth]);

  const energyPoints = useMemo(() => {
    const positions = new Float32Array(2 * 3);
    const point = new Vector3();
    for (let index = 0; index < 2; index += 1) {
      curve.getPointAt(index === 0 ? 0.22 : 0.68, point);
      positions.set([point.x, point.y, point.z], index * 3);
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(positions, 3));
    return geometry;
  }, [curve]);
  const pointMaterial = useMemo(() => new PointsMaterial({ color: "#a3f2ff", size: 0.028, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false, sizeAttenuation: true }), []);
  const baseOrbitColor = useMemo(() => new Color("#62d2df"), []);
  const captureOrbitColor = useMemo(() => new Color(captureColor), [captureColor]);

  useEffect(() => () => {
    segments.forEach((segment) => { segment.core.dispose(); segment.glow.dispose(); segment.coreMaterial.dispose(); segment.glowMaterial.dispose(); });
    energyPoints.dispose(); pointMaterial.dispose();
  }, [energyPoints, pointMaterial, segments]);

  useFrame((state,delta) => {
    pointMaterial.opacity = parameters.orbitEnergyPointIntensity * 0.72;
    segments.forEach((segment, index) => {
      const onCaptureArc = captureActive && index >= 1 && index <= 5;
      segment.coreMaterial.opacity = MathUtils.damp(segment.coreMaterial.opacity, segment.coreOpacity + (onCaptureArc ? 0.2 : 0), 7, delta);
      segment.coreMaterial.color.lerp(onCaptureArc ? captureOrbitColor : baseOrbitColor, 1 - Math.exp(-7 * delta));
    });
    if (!planetAnchor.current) return;
    const progress = (initialProgress + state.clock.elapsedTime * 0.0075) % 1;
    curve.getPointAt(progress, planetPoint);
    planetAnchor.current.position.copy(planetPoint);
    onPlanetPosition?.(planetPoint);
  });

  return (
    <group rotation={[parameters.orbitTiltX, parameters.orbitTiltY, 0.09]}>
      {segments.map((segment, index) => (
        <group key={index}>
          <mesh geometry={segment.core} material={segment.coreMaterial} />
          <mesh geometry={segment.glow} material={segment.glowMaterial} />
        </group>
      ))}
      <points geometry={energyPoints} material={pointMaterial} />
      <group ref={planetAnchor}><OuterPlanet parameters={parameters} /></group>
    </group>
  );
}
