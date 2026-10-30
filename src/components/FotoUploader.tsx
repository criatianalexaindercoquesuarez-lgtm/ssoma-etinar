'use client';
import type { FotoItem } from '@/lib/imagen';
import { inputCls } from './ui';

export default function FotoUploader({ fotos, onChange, label = 'Agregar fotos' }: {
  fotos: FotoItem[]; onChange: (f: FotoItem[]) => void; label?: string;
}) {
  function agregar(files: FileList | null) {
    const nuevas = Array.from(files || []).map((file) => ({ file, descripcion: '', preview: URL.createObjectURL(file) }));
    onChange([...fotos, ...nuevas]);
  }
  return (
    <div className="space-y-2">
      {fotos.map((f, i) => (
        <div key={f.preview} className="flex gap-2 items-start">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={f.preview} alt="" className="w-16 h-16 object-cover rounded-lg border border-[#E3E1D9]" />
          <input
            value={f.descripcion}
            onChange={(e) => onChange(fotos.map((x, j) => (j === i ? { ...x, descripcion: e.target.value } : x)))}
            placeholder="Descripción de la foto"
            className={`${inputCls} flex-1`}
          />
          <button type="button" onClick={() => onChange(fotos.filter((_, j) => j !== i))} className="text-[#A32D2D] text-sm px-2 py-2">✕</button>
        </div>
      ))}
      <label className="inline-flex items-center gap-2 bg-[#F1EFE8] text-[#0C447C] text-sm font-medium px-3 py-2 rounded-lg cursor-pointer">
        📷 {label}
        <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { agregar(e.target.files); e.target.value = ''; }} />
      </label>
    </div>
  );
}
