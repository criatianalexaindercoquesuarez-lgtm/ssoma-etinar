import { NextRequest, NextResponse } from 'next/server';
import { getSesion } from '@/lib/workflow';
import { createAdminClient } from '@/lib/supabase/admin';
import { appUrl } from '@/lib/notificaciones';

/** Alta de usuario: envía invitación por correo y crea su perfil con rol, cargo y obra. */
export async function POST(req: NextRequest) {
  const s = await getSesion();
  if (!s || !['admin', 'coordinador_sst'].includes(s.perfil.rol)) {
    return NextResponse.json({ error: 'Solo Administrador o Coordinador SST' }, { status: 403 });
  }
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: 'Falta SUPABASE_SERVICE_ROLE_KEY en el servidor' }, { status: 500 });

  const { nombre, email, rol, cargo, telefono, empresa, proyecto_id } = await req.json();
  if (!nombre || !email || !rol) return NextResponse.json({ error: 'Nombre, correo y rol son obligatorios' }, { status: 400 });

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo: `${appUrl()}/login` });
  if (error || !data.user) return NextResponse.json({ error: 'No se pudo invitar: ' + error?.message }, { status: 400 });

  const { error: e2 } = await admin.from('perfiles').upsert({
    id: data.user.id, nombre, email, rol, cargo: cargo || null, telefono: telefono || null,
    empresa: empresa || null, proyecto_id: proyecto_id || null,
  });
  if (e2) return NextResponse.json({ error: 'Invitado, pero falló el perfil: ' + e2.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

/** Actualizar rol / cargo / obra de un usuario existente. */
export async function PATCH(req: NextRequest) {
  const s = await getSesion();
  if (!s || !['admin', 'coordinador_sst'].includes(s.perfil.rol)) {
    return NextResponse.json({ error: 'Solo Administrador o Coordinador SST' }, { status: 403 });
  }
  const db = createAdminClient() || s.supabase;
  const { id, ...cambios } = await req.json();
  const permitido = ['nombre', 'rol', 'cargo', 'telefono', 'empresa', 'proyecto_id', 'activo'];
  const fila = Object.fromEntries(Object.entries(cambios).filter(([k]) => permitido.includes(k)).map(([k, v]) => [k, v === '' ? null : v]));
  const { error } = await db.from('perfiles').update(fila).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
