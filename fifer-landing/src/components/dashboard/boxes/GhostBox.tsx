'use client';

import SmartBox from '../SmartBox';
import { HiOutlineInbox, HiOutlinePlus } from 'react-icons/hi';

export default function GhostBox() {
  return (
    <SmartBox 
      title="Proyectos en Revisión" 
      icon={<HiOutlineInbox className="w-4 h-4" />}
      className="col-span-12 lg:col-span-8"
    >
      {/* Ghost/Empty State */}
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-xl bg-[#1F2937] flex items-center justify-center mb-4">
          <HiOutlineInbox className="w-8 h-8 text-[#6B7280]" />
        </div>
        <h4 className="text-base font-medium text-[#F9FAFB] mb-2">
          Sin proyectos en revisión
        </h4>
        <p className="text-sm text-[#6B7280] max-w-sm mb-6">
          Los proyectos que estén pendientes de revisión municipal aparecerán aquí para su seguimiento.
        </p>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-[#EAB308] text-[#0A0F1E] text-sm font-medium rounded-xl hover:bg-[#EAB308]/90 transition-all">
          <HiOutlinePlus className="w-4 h-4" />
          <span>Agregar Proyecto</span>
        </button>
      </div>
    </SmartBox>
  );
}
