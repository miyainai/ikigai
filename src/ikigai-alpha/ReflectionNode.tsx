import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { easing } from "maath";
import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { Group, MathUtils, PerspectiveCamera, Vector2, Vector3 } from "three";
import { reflectionPosition } from "./reflectionPosition";
import type { FieldConfig, Reflection } from "./types";

interface ReflectionNodeProps {
  reflection: Reflection;
  config: FieldConfig;
  index: number;
  selected: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  planetPosition: Vector3;
  pending?: boolean;
  onPendingScreenPosition?: (x: number, y: number) => void;
  compact?: boolean;
}

export function ReflectionNode({reflection,config,index,selected,onHover,onSelect,planetPosition,pending=false,onPendingScreenPosition,compact=false}:ReflectionNodeProps){
  const groupRef=useRef<Group>(null);const nodeRef=useRef<HTMLDivElement>(null);const pendingSettledFrames=useRef(0);const [hovered,setHovered]=useState(false);const pointerDown=useMemo(()=>new Vector2(),[]);
  const camera=useThree((state)=>state.camera as PerspectiveCamera);const viewportSize=useThree((state)=>state.size);
  const seed=reflection.positionSeed;
  const base=useMemo(()=>reflectionPosition(reflection,index,config,compact),[compact,config,index,reflection]);
  const target=useMemo(()=>new Vector3(),[]);
  const separation=useMemo(()=>new Vector3(),[]);
  const labelSize=useMemo(()=>new Vector2(80,16),[]);const worldPosition=useMemo(()=>new Vector3(),[]);const worldScale=useMemo(()=>new Vector3(1,1,1),[]);
  useEffect(()=>{const element=nodeRef.current;if(!element)return;const measure=()=>{const rect=element.getBoundingClientRect();labelSize.set(rect.width,rect.height);};measure();const observer=new ResizeObserver(measure);observer.observe(element);return()=>observer.disconnect();},[labelSize]);
  useFrame((state,delta)=>{
    if(!groupRef.current)return;
    const cycle=8+seed*6;
    const motionScale=(pending?0:selected||hovered?0.14:1)*config.nodeMotionProfile.speed;
    const angle=state.clock.elapsedTime*(Math.PI*2/cycle)*motionScale+seed*Math.PI*2;
    const radiusX=0.11+seed*0.055;
    const radiusY=0.055+(1-seed)*0.03;
    target.set(
      base.x+Math.cos(angle)*radiusX,
      base.y+Math.sin(angle*0.86+index*0.42)*radiusY+Math.sin(angle*0.37+seed*5)*0.025,
      base.z+Math.sin(angle*0.72+seed*4)*MathUtils.clamp(config.nodeMotionProfile.depth*1.25,0.035,0.065),
    );
    separation.set(target.x-planetPosition.x,target.y-planetPosition.y,target.z-(planetPosition.z-0.32));
    const distance=separation.length();
    if(distance<0.62&&distance>0.001){
      separation.multiplyScalar((0.62-distance)/distance);
      target.add(separation);
    }

    groupRef.current.getWorldPosition(worldPosition);
    groupRef.current.getWorldScale(worldScale);
    const worldHeight=2*Math.tan(MathUtils.degToRad(camera.fov)*0.5)*camera.position.distanceTo(worldPosition);
    const localPerPixel=worldHeight/Math.max(viewportSize.height,1)/Math.max(worldScale.x,0.001);
    const halfWidth=labelSize.x*localPerPixel*0.5;
    const halfHeight=labelSize.y*localPerPixel*0.5;
    const safeX=Math.max(0.34,1.18*0.62-halfWidth*1.15-0.04);
    const safeY=compact
      ?Math.max(0.3,0.56-halfHeight*0.85)
      :Math.max(0.12,0.19-halfHeight*1.4);
    const safeZ=0.025;
    target.z=MathUtils.clamp(target.z,-safeZ,safeZ);
    let edgeRatio=(target.x*target.x)/(safeX*safeX)+(target.y*target.y)/(safeY*safeY);
    if(edgeRatio>1){
      const inward=1/Math.sqrt(edgeRatio);
      target.x*=inward;
      target.y*=inward;
    }

    const titleX=0.24+halfWidth;
    const titleY=(compact?0.2:0.12)+halfHeight;
    const titleRatio=(target.x*target.x)/(titleX*titleX)+(target.y*target.y)/(titleY*titleY);
    if(titleRatio<1&&titleRatio>0.001){
      const outward=1/Math.sqrt(titleRatio);
      target.x*=outward;
      target.y*=outward;
    }

    // The title exclusion can push a node outward, so the field boundary is authoritative.
    edgeRatio=(target.x*target.x)/(safeX*safeX)+(target.y*target.y)/(safeY*safeY);
    if(edgeRatio>1){
      const inward=1/Math.sqrt(edgeRatio);
      target.x*=inward;
      target.y*=inward;
    }

    if(nodeRef.current)nodeRef.current.style.flexDirection=compact?(target.x<0?"row-reverse":"row"):(distance<0.72&&target.x<planetPosition.x?"row-reverse":"row");
    if(pending){
      groupRef.current.position.copy(target);
      pendingSettledFrames.current+=1;
      if(pendingSettledFrames.current>1&&nodeRef.current&&onPendingScreenPosition){
        const rect=nodeRef.current.getBoundingClientRect();
        if(rect.width>0&&rect.height>0)onPendingScreenPosition(rect.left+rect.width*0.5,rect.top+rect.height*0.5);
      }
    }else{
      pendingSettledFrames.current=0;
      easing.damp3(groupRef.current.position,target,0.7,delta);
    }
  });
  const setHover=(value:boolean)=>{setHovered(value);onHover(value?reflection.id:null);};
  return <group ref={groupRef} position={base}><Html center distanceFactor={compact?5.6:8} zIndexRange={[18,2]}><div ref={nodeRef} className={`alpha-node${selected?" is-selected":""}${pending?" is-pending":""}`} style={{"--field-color":config.color,"--field-halo":config.haloColor} as CSSProperties}><i className="alpha-node-anchor" aria-hidden="true"/><button type="button" className="alpha-word" onPointerEnter={()=>setHover(true)} onPointerLeave={()=>setHover(false)} onPointerDown={(event)=>pointerDown.set(event.clientX,event.clientY)} onPointerUp={(event)=>{const dx=event.clientX-pointerDown.x;const dy=event.clientY-pointerDown.y;if(dx*dx+dy*dy<25)onSelect(reflection.id);}}>{reflection.label}</button></div></Html></group>;
}
