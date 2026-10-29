'use client';
import { useEffect, useRef, useState } from 'react';

/** Firma manuscrita opcional en pantalla táctil. Devuelve PNG (dataURL) o '' si está vacía. */
export default function FirmaPad({ onChange }: { onChange: (png: string) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const dibujando = useRef(false);
  const [vacia, setVacia] = useState(true);

  useEffect(() => {
    const c = ref.current!;
    c.width = c.offsetWidth * 2; c.height = 140 * 2;
    const ctx = c.getContext('2d')!;
    ctx.scale(2, 2); ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.strokeStyle = '#0C447C';
  }, []);

  const pos = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };
  return (
    <div>
      <canvas
        ref={ref}
        className="w-full h-[140px] border border-dashed border-[#9C9A92] rounded-lg bg-white touch-none"
        onPointerDown={(e) => { dibujando.current = true; const [x, y] = pos(e); const ctx = ref.current!.getContext('2d')!; ctx.beginPath(); ctx.moveTo(x, y); }}
        onPointerMove={(e) => { if (!dibujando.current) return; const [x, y] = pos(e); const ctx = ref.current!.getContext('2d')!; ctx.lineTo(x, y); ctx.stroke(); }}
        onPointerUp={() => { dibujando.current = false; setVacia(false); onChange(ref.current!.toDataURL('image/png')); }}
        onPointerLeave={() => { if (dibujando.current) { dibujando.current = false; setVacia(false); onChange(ref.current!.toDataURL('image/png')); } }}
      />
      <div className="flex justify-between text-[11px] text-[#9C9A92] mt-1">
        <span>{vacia ? 'Firme aquí (opcional): queda además el registro electrónico con nombre, cargo y hora.' : 'Firma capturada'}</span>
        <button type="button" onClick={() => { const c = ref.current!; c.getContext('2d')!.clearRect(0, 0, c.width, c.height); setVacia(true); onChange(''); }} className="text-[#185FA5]">Borrar</button>
      </div>
    </div>
  );
}
