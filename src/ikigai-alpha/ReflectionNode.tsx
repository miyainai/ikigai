import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import { Group, Vector2 } from "three";
import { reflectionPosition } from "./reflectionPosition";
import type { LoveReflection } from "./types";

function hash(value:string){let result=2166136261;for(let index=0;index<value.length;index+=1){result^=value.charCodeAt(index);result=Math.imul(result,16777619);}return(result>>>0)/4294967295;}

interface ReflectionNodeProps {
  reflection: LoveReflection;
  index: number;
  selected: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}

export function ReflectionNode({reflection,index,selected,onHover,onSelect}:ReflectionNodeProps){
  const groupRef=useRef<Group>(null);const [hovered,setHovered]=useState(false);const pointerDown=useMemo(()=>new Vector2(),[]);
  const seed=useMemo(()=>hash(reflection.id),[reflection.id]);
  const base=useMemo(()=>reflectionPosition(reflection,index),[index,reflection]);
  useFrame((state)=>{if(!groupRef.current)return;const speed=hovered?0.16:1;const time=state.clock.elapsedTime*speed;groupRef.current.position.set(base.x+Math.sin(time*0.16+seed*8)*0.018,base.y+Math.sin(time*0.13+index)*0.014,base.z+Math.cos(time*0.15+seed*5)*0.017);});
  const setHover=(value:boolean)=>{setHovered(value);onHover(value?reflection.id:null);};
  return <group ref={groupRef} position={base}><Html center distanceFactor={8} zIndexRange={[18,2]}><div className={`alpha-node${selected?" is-selected":""}`}><i className="alpha-node-anchor" aria-hidden="true"/><button type="button" className="alpha-word" onPointerEnter={()=>setHover(true)} onPointerLeave={()=>setHover(false)} onPointerDown={(event)=>pointerDown.set(event.clientX,event.clientY)} onPointerUp={(event)=>{const dx=event.clientX-pointerDown.x;const dy=event.clientY-pointerDown.y;if(dx*dx+dy*dy<25)onSelect(reflection.id);}}>{reflection.label}</button></div></Html></group>;
}
