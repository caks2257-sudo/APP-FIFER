import { redirect } from 'next/navigation';

export default function RootPage() {
  // Redirigimos automáticamente al dashboard para evitar errores de componentes faltantes
  redirect('/dashboard');
}