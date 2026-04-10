import DashboardLayout from '@/components/dashboard/DashboardLayout';

export default function PerfilPage() {
  return (
    <DashboardLayout>
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <h1 className="mb-4 text-2xl font-bold text-[#F9FAFB]">Perfil Profesional</h1>
        <p className="text-[#94A3B8]">
          Módulo en construcción. Aquí integraremos datos de cuenta, credenciales y preferencias.
        </p>
      </div>
    </DashboardLayout>
  );
}
