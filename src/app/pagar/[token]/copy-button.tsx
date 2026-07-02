"use client";
import { useState } from "react";
import { Copy, Check } from "lucide-react";
export default function CopyButton({text}:{text:string}){const [ok,setOk]=useState(false);
  return <button onClick={async()=>{await navigator.clipboard.writeText(text);setOk(true);setTimeout(()=>setOk(false),2000);}} className="inline-flex items-center gap-2 rounded-lg bg-recover-500 px-4 py-2.5 font-medium text-navy-900 hover:bg-recover-400">{ok?<><Check size={16}/> Copiado!</>:<><Copy size={16}/> Copiar código PIX</>}</button>;}
