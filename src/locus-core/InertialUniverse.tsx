import { useFrame, useThree } from "@react-three/fiber";
import { easing } from "maath";
import { type MutableRefObject, type ReactNode, useEffect, useMemo, useRef } from "react";
import { Group, MathUtils, Vector2, type Vector3Tuple } from "three";

interface InertialUniverseProps {
  children: ReactNode;
  resetVersion: number;
  position?: Vector3Tuple;
  renderBackdrop?: (yaw: MutableRefObject<number>, pitch: MutableRefObject<number>) => ReactNode;
  onDraggingChange?: (dragging: boolean) => void;
}

export function InertialUniverse({children,resetVersion,position=[0,0,0],renderBackdrop,onDraggingChange}:InertialUniverseProps){
  const groupRef=useRef<Group>(null);
  const pointerActive=useRef(false);
  const lastPointer=useMemo(()=>new Vector2(),[]);
  const target=useMemo(()=>new Vector2(),[]);
  const velocity=useMemo(()=>new Vector2(),[]);
  const displayedYaw=useRef(0);
  const displayedPitch=useRef(0);
  const lastTime=useRef(0);
  const {gl}=useThree();

  useEffect(()=>{target.set(0,0);velocity.set(0,0);},[resetVersion,target,velocity]);
  useEffect(()=>{
    const element=gl.domElement;
    element.style.cursor="grab";
    element.style.touchAction="none";
    const down=(event:PointerEvent)=>{if(event.button!==0)return;pointerActive.current=true;onDraggingChange?.(true);lastPointer.set(event.clientX,event.clientY);lastTime.current=performance.now();velocity.set(0,0);element.setPointerCapture(event.pointerId);element.style.cursor="grabbing";};
    const move=(event:PointerEvent)=>{if(!pointerActive.current)return;const dx=event.clientX-lastPointer.x;const dy=event.clientY-lastPointer.y;const now=performance.now();const elapsed=Math.max((now-lastTime.current)/1000,1/120);const yawDelta=dx*0.0072;const pitchDelta=-dy*0.0056;target.x=MathUtils.clamp(target.x+yawDelta,-0.65,0.65);target.y=MathUtils.clamp(target.y+pitchDelta,-0.3,0.3);velocity.x=MathUtils.lerp(velocity.x,MathUtils.clamp(yawDelta/elapsed,-1.05,1.05),0.28);velocity.y=MathUtils.lerp(velocity.y,MathUtils.clamp(pitchDelta/elapsed,-0.72,0.72),0.28);lastPointer.set(event.clientX,event.clientY);lastTime.current=now;};
    const up=(event:PointerEvent)=>{if(!pointerActive.current)return;pointerActive.current=false;onDraggingChange?.(false);if(element.hasPointerCapture(event.pointerId))element.releasePointerCapture(event.pointerId);element.style.cursor="grab";};
    element.addEventListener("pointerdown",down);element.addEventListener("pointermove",move);element.addEventListener("pointerup",up);element.addEventListener("pointercancel",up);
    return()=>{onDraggingChange?.(false);element.removeEventListener("pointerdown",down);element.removeEventListener("pointermove",move);element.removeEventListener("pointerup",up);element.removeEventListener("pointercancel",up);};
  },[gl,lastPointer,onDraggingChange,target,velocity]);
  useFrame((_,delta)=>{const group=groupRef.current;if(!group)return;if(!pointerActive.current){target.x=MathUtils.clamp(target.x+velocity.x*delta,-0.65,0.65);target.y=MathUtils.clamp(target.y+velocity.y*delta,-0.3,0.3);velocity.multiplyScalar(Math.exp(-4.8*delta));}easing.damp(group.rotation,"y",target.x,0.22,delta);easing.damp(group.rotation,"x",target.y,0.22,delta);displayedYaw.current=group.rotation.y;displayedPitch.current=group.rotation.x;});
  return <>{renderBackdrop?.(displayedYaw,displayedPitch)}<group ref={groupRef} position={position}>{children}</group></>;
}
