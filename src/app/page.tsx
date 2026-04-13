import { redirect } from 'next/navigation';

// Esta página solo existe para atrapar a los usuarios que llegan a la raíz
// y enviarlos inmediatamente al locale por defecto.
export default function RootPage() {
  redirect('/es-CL');
}