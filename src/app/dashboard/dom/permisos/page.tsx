import DashboardLayout from '@/components/dashboard/DashboardLayout';

export default function PermisosPage() {
  return (
    <DashboardLayout>
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <h1 className="mb-4 text-2xl font-bold text-[#F9FAFB]">Permisos de Edificación (DOM)</h1>
        <p className="text-[#94A3B8]">
          Módulo en construcción. Aquí vivirá el flujo técnico de permisos, revisiones y estados de
          edificación en terreno DOM.
        </p>
      </div>
    </DashboardLayout>
  );
}
