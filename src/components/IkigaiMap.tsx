import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { easing } from "maath";
import { useMemo, useRef } from "react";
import { Group, Vector2 } from "three";
import { fields, type RegionId } from "../data/regions";
import { DreamForm } from "./DreamForm";
import { IkigaiField } from "./IkigaiField";

interface IkigaiMapProps {
  reducedMotion: boolean;
  hoveredRegion: RegionId | null;
  selectedRegion: RegionId | null;
  onHover: (region: RegionId | null) => void;
  onSelect: (region: RegionId) => void;
  dragging: boolean;
}

export function IkigaiMap(props: IkigaiMapProps) {
  const mapRef = useRef<Group>(null);
  const centerRef = useRef<Group>(null);
  const pointerDown = useMemo(() => new Vector2(), []);
  const { width } = useThree((state) => state.size);
  const centerActive = props.selectedRegion === "ikigai" || props.hoveredRegion === "ikigai";

  useFrame((state, delta) => {
    if (!mapRef.current || !centerRef.current) return;
    const narrow = width < 720;
    easing.damp3(mapRef.current.position, [0, 0, 0], 0.55, delta);
    const scale = narrow ? 0.43 : 0.64;
    easing.damp3(mapRef.current.scale, [scale, scale, scale], 0.55, delta);
    const motion = props.reducedMotion ? 0.08 : 1;
    centerRef.current.rotation.y += delta * 0.16 * motion;
    centerRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.32) * 0.16 * motion;
    const centerScale = centerActive ? 0.36 : 0.32 + Math.sin(state.clock.elapsedTime * 0.55) * 0.014 * motion;
    easing.damp3(centerRef.current.scale, [centerScale, centerScale, centerScale], 0.32, delta);
  });

  return (
    <group ref={mapRef}>
      {fields.map((field) => (
        <IkigaiField key={field.id} config={field} {...props} />
      ))}

      <group
        position={[0, 0, 0.5]}
        onPointerEnter={(event) => {
          event.stopPropagation();
          if (!props.selectedRegion) props.onHover("ikigai");
          (event.nativeEvent.target as HTMLElement).style.cursor = "pointer";
        }}
        onPointerLeave={(event) => {
          event.stopPropagation();
          if (!props.selectedRegion) props.onHover(null);
          (event.nativeEvent.target as HTMLElement).style.cursor = "grab";
        }}
        onPointerDown={(event) => {
          pointerDown.set(event.nativeEvent.clientX, event.nativeEvent.clientY);
        }}
        onPointerUp={(event) => {
          event.stopPropagation();
          const x = event.nativeEvent.clientX - pointerDown.x;
          const y = event.nativeEvent.clientY - pointerDown.y;
          if (x * x + y * y <= 25) props.onSelect("ikigai");
        }}
      >
        <group ref={centerRef}>
          <DreamForm
            colorA="#4053cf"
            colorB="#58b8ce"
            deformation={0.285}
            glow={centerActive ? 1 : 0.55}
            reducedMotion={props.reducedMotion}
          />
        </group>
        <pointLight color="#8bcff0" intensity={centerActive ? 2.2 : 1.05} distance={2.8} />
        <pointLight color="#a078ff" position={[-0.2, 0.18, 0.25]} intensity={centerActive ? 1.4 : 0.58} distance={1.8} />
        <Html center position={[0, 0, 0.28]} distanceFactor={8} zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
          <div className={`center-label${props.dragging ? " is-dragging" : ""}`}><span>Your</span><strong>IKIGAI</strong></div>
        </Html>
      </group>
    </group>
  );
}
