import { useFrame, useThree } from "@react-three/fiber";
import { easing } from "maath";
import { useEffect, useMemo, useRef, useState } from "react";
import { Group, MathUtils, Vector2, Vector3 } from "three";
import type { RegionId } from "../data/regions";
import { IkigaiMap } from "./IkigaiMap";

interface UniverseRigProps {
  reducedMotion: boolean;
  hoveredRegion: RegionId | null;
  selectedRegion: RegionId | null;
  onHover: (region: RegionId | null) => void;
  onSelect: (region: RegionId) => void;
  resetVersion: number;
}

export function UniverseRig(props: UniverseRigProps) {
  const groupRef = useRef<Group>(null);
  const pointerActive = useRef(false);
  const moved = useRef(false);
  const lastPointer = useMemo(() => new Vector2(), []);
  const startPointer = useMemo(() => new Vector2(), []);
  const targetRotation = useMemo(() => new Vector2(), []);
  const velocity = useMemo(() => new Vector2(), []);
  const targetPosition = useMemo(() => new Vector3(), []);
  const lastTime = useRef(0);
  const [dragging, setDragging] = useState(false);
  const { gl, width } = useThree((state) => ({ gl: state.gl, width: state.size.width }));

  useEffect(() => {
    targetRotation.set(0, 0);
    velocity.set(0, 0);
  }, [props.resetVersion, targetRotation, velocity]);

  useEffect(() => {
    if (props.selectedRegion) {
      targetRotation.set(0, 0);
      velocity.set(0, 0);
    }
  }, [props.selectedRegion, targetRotation, velocity]);

  useEffect(() => {
    const element = gl.domElement;
    const sensitivity = width < 720 ? 0.0042 : 0.0055;
    element.style.cursor = "grab";
    element.style.touchAction = "none";

    const pointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || props.selectedRegion) return;
      pointerActive.current = true;
      moved.current = false;
      startPointer.set(event.clientX, event.clientY);
      lastPointer.copy(startPointer);
      lastTime.current = performance.now();
      velocity.set(0, 0);
      element.setPointerCapture(event.pointerId);
      element.style.cursor = "grabbing";
    };

    const pointerMove = (event: PointerEvent) => {
      if (!pointerActive.current) return;
      const dx = event.clientX - lastPointer.x;
      const dy = event.clientY - lastPointer.y;
      const totalX = event.clientX - startPointer.x;
      const totalY = event.clientY - startPointer.y;
      if (!moved.current && totalX * totalX + totalY * totalY > 16) {
        moved.current = true;
        setDragging(true);
      }

      const now = performance.now();
      const elapsed = Math.max((now - lastTime.current) / 1000, 1 / 120);
      targetRotation.x = MathUtils.clamp(targetRotation.x + dx * sensitivity, -0.55, 0.55);
      targetRotation.y = MathUtils.clamp(targetRotation.y - dy * sensitivity, -0.28, 0.28);
      velocity.x = MathUtils.lerp(velocity.x, MathUtils.clamp((dx * sensitivity) / elapsed, -0.7, 0.7), 0.32);
      velocity.y = MathUtils.lerp(velocity.y, MathUtils.clamp((-dy * sensitivity) / elapsed, -0.5, 0.5), 0.32);
      lastPointer.set(event.clientX, event.clientY);
      lastTime.current = now;
    };

    const pointerUp = (event: PointerEvent) => {
      if (!pointerActive.current) return;
      pointerActive.current = false;
      setDragging(false);
      if (!moved.current) velocity.set(0, 0);
      if (element.hasPointerCapture(event.pointerId)) element.releasePointerCapture(event.pointerId);
      element.style.cursor = "grab";
    };

    element.addEventListener("pointerdown", pointerDown);
    element.addEventListener("pointermove", pointerMove);
    element.addEventListener("pointerup", pointerUp);
    element.addEventListener("pointercancel", pointerUp);
    return () => {
      element.removeEventListener("pointerdown", pointerDown);
      element.removeEventListener("pointermove", pointerMove);
      element.removeEventListener("pointerup", pointerUp);
      element.removeEventListener("pointercancel", pointerUp);
    };
  }, [gl, lastPointer, props.selectedRegion, startPointer, targetRotation, velocity, width]);

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;

    if (!pointerActive.current && !props.reducedMotion) {
      targetRotation.x = MathUtils.clamp(targetRotation.x + velocity.x * delta, -0.55, 0.55);
      targetRotation.y = MathUtils.clamp(targetRotation.y + velocity.y * delta, -0.28, 0.28);
      const decay = Math.exp(-5.5 * delta);
      velocity.multiplyScalar(decay);
    }

    const idleMotion = props.reducedMotion || pointerActive.current || props.selectedRegion ? 0 : 1;
    const idleYaw = Math.sin(state.clock.elapsedTime * 0.12) * 0.045 * idleMotion;
    const idlePitch = Math.sin(state.clock.elapsedTime * 0.095 + 1.3) * 0.024 * idleMotion;
    easing.damp(group.rotation, "y", targetRotation.x + idleYaw, 0.18, delta);
    easing.damp(group.rotation, "x", targetRotation.y + idlePitch, 0.18, delta);
    const narrow = width < 720;
    targetPosition.set(narrow ? 0 : 0.78, narrow ? 0.55 : 0, 0);
    easing.damp3(group.position, targetPosition, 0.55, delta);
  });

  return (
    <group ref={groupRef}>
      <IkigaiMap {...props} dragging={dragging} />
    </group>
  );
}
