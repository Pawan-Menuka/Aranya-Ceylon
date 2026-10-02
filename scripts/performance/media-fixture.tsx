"use client";

// Included only in the isolated fixture build; never copied into live app routes.
import { useState } from "react";
import { ImageSlot } from "@/components/primitives/ImageSlot";
import { SpicePhoto } from "@/components/primitives/SpicePhoto";

export default function MediaFixture() {
  const [editor,setEditor]=useState(false);
  return <main style={{ padding: 30 }}>
    <ImageSlot id="fixture-local" src="/images/about/about-origin.webp" shape="circle" position="40% 60%" sizes="300px" style={{width:300,height:200}} />
    <ImageSlot id="fixture-remote" src="https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg" fit="contain" sizes="300px" style={{width:300,height:200}} />
    <ImageSlot id="fixture-missing" shape="rounded" radius={18} placeholder="Missing photography" style={{width:300,height:200}} />
    <div style={{width:62}}><SpicePhoto spice={{name:"Ceylon Cinnamon Quills",slug:"ceylon-cinnamon-quills",base:"#AB713B",deep:"#502C18",surface:"#FDF9F3"}} sizes="62px" /></div>
    <button onClick={()=>setEditor(true)}>Enable fixture editor</button>
    <ImageSlot id="fixture-editor-modern" src="/images/about/about-origin.webp" editor={editor} shape="rect" style={{width:300,height:200,display:"block"}} />
    <ImageSlot id="fixture-editor-legacy" src="/images/about/about-origin.webp" editor={editor} shape="rect" style={{width:300,height:200,display:"block"}} />
  </main>;
}
