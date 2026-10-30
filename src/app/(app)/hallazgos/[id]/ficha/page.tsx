import { redirect } from 'next/navigation';
// Enlaces antiguos a la ficha imprimible → reporte individual en PDF
export default function FichaPage({ params }: { params: { id: string } }) {
  redirect(`/api/export/hallazgo/${params.id}`);
}
