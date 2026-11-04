import { NextRequest, NextResponse } from 'next/server';
import { getSesion } from '@/lib/workflow';
import { createAdminClient } from '@/lib/supabase/admin';
import { appUrl } from '@/lib/notificaciones';

/** Contraseña temporal fácil de dictar: Etinar-4821-kpm */
function claveTemporal() {
  const n = Math.floor(1000 + Math.random() * 9000);
  const l = Array.from({ length: 3 }, () => 'abcdefghjkmnpqrstuvwxyz'[Math.floor(Math.random() * 23)]).join('');
  return `Etinar-${n}-${l}`;
}

/**
 * Alta de usuario con contraseña temporal (no depende del correo de Supabase).
 * El administrador entrega la clave al usuario (WhatsApp / en persona) y este la cambia en "Mi cuenta".
 */
export async function POST(req: NextRequest) {
  const s = await getSesion();
  if (!s || !['admin', 'coordinador_sst'].includes(s.perfil.rol)) {
    return NextResponse.json({ error: 'Solo Administrador o Coordinador SST' }, { status: 403 });
  }
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: 'Falta SUPABASE_SERVICE_ROLE_KEY en el servidor' }, { status: 500 });

  const { nombre, email, rol, cargo, telefono, empresa, proyecto_id } = await req.json();
  if (!nombre || !email || !rol) return NextResponse.json({ error: 'Nombre, correo y rol son obligatorios' }, { status: 400 });

  const clave = claveTemporal();
  const { data, error } = await admin.auth.admin.createUser({
    email: String(email).trim().toLowerCase(), password: clave, email_confirm: true, user_metadata: { nombre },
  });
  if (error || !data.user) {
    const existe = /already|registered|exists/i.test(error?.message || '');
    return NextResponse.json({
      error: existe
        ? 'Ese correo ya tiene cuenta. Búsquelo en la lista y use "Nueva clave".'
        : 'No se pudo crear el usuario: ' + error?.message,
    }, { status: 400 });
  }

  const { error: e2 } = await admin.from('perfiles').upsert({
    id: data.user.id, nombre, email: String(email).trim().toLowerCase(), rol, cargo: cargo || null,
    telefono: telefono || null, empresa: empresa || null, proyecto_id: proyecto_id || null,
  });
  if (e2) return NextResponse.json({ error: 'Usuario creado, pero falló el perfil: ' + e2.message }, { status: 400 });
  return NextResponse.json({ ok: true, email, clave, url: `${appUrl()}/login` });
}

/** Actualizar rol / cargo / obra de un usuario existente. */
export async function PATCH(req: NextRequest) {
  const s = await getSesion();
  if (!s || !['admin', 'coordinador_sst'].includes(s.perfil.rol)) {
    return NextResponse.json({ error: 'Solo Administrador o Coordinador SST' }, { status: 403 });
  }
  const db = createAdminClient() || s.supabase;
  const { id, nueva_clave, ...cambios } = await req.json();

  if (nueva_clave) {
    const admin = createAdminClient();
    if (!admin) return NextResponse.json({ error: 'Falta SUPABASE_SERVICE_ROLE_KEY en el servidor' }, { status: 500 });
    const clave = claveTemporal();
    const { error } = await admin.auth.admin.updateUserById(id, { password: clave, email_confirm: true });
    if (error) return NextResponse.json({ error: 'No se pudo cambiar la clave: ' + error.message }, { status: 400 });
    return NextResponse.json({ ok: true, clave, url: `${appUrl()}/login` });
  }
  const permitido = ['nombre', 'rol', 'cargo', 'telefono', 'empresa', 'proyecto_id', 'activo'];
  const fila = Object.fromEntries(Object.entries(cambios).filter(([k]) => permitido.includes(k)).map(([k, v]) => [k, v === '' ? null : v]));
  const { error } = await db.from('perfiles').update(fila).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
