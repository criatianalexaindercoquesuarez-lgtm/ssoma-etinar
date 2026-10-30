'use client';
import { createClient } from '@/lib/supabase/client';

/**
 * Reduce la foto a máx. 1600 px y la convierte a JPEG (también convierte HEIC en Safari).
 * Así los PDF no pesan demasiado y las imágenes no se deforman.
 */
export async function comprimirFoto(file: File, max = 1600, calidad = 0.82): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file);
    const escala = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * escala);
    canvas.height = Math.round(bmp.height * escala);
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    return await new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej()), 'image/jpeg', calidad));
  } catch {
    return file; // si el navegador no puede decodificarla, se sube tal cual
  }
}

export interface FotoItem { file: File; descripcion: string; preview: string }

/** Sube fotos a Storage bajo <hallazgoId>/ y devuelve rutas + descripción. */
export async function subirFotos(hallazgoId: string, fotos: FotoItem[], prefijo: string) {
  const supabase = createClient();
  const out: { storage_path: string; descripcion: string }[] = [];
  for (let i = 0; i < fotos.length; i++) {
    const f = fotos[i];
    const blob = await comprimirFoto(f.file);
    const ext = blob.type === 'image/jpeg' ? 'jpg' : (f.file.name.split('.').pop() || 'jpg');
    const path = `${hallazgoId}/${prefijo}-${Date.now()}-${i}.${ext}`;
    const { error } = await supabase.storage.from('evidencias').upload(path, blob, { contentType: blob.type || 'image/jpeg' });
    if (error) throw new Error('Error al subir foto: ' + error.message);
    out.push({ storage_path: path, descripcion: f.descripcion });
  }
  return out;
}
