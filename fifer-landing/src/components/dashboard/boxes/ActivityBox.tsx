'use client';

import SmartBox from '../SmartBox';
import { HiOutlineClock, HiOutlineCheckCircle, HiOutlineExclamation, HiOutlineDocumentAdd } from 'react-icons/hi';

interface ActivityItem {
  id: string;
  type: 'approved' | 'pending' | 'new';
  title: string;
  description: string;
  time: string;
}

const activities: ActivityItem[] = [
  {
    id: '1',
    type: 'approved',
    title: 'Permiso DOM Aprobado',
    description: 'Proyecto Edificio Los Arrayanes',
    time: 'Hace 2h',
  },
  {
    id: '2',
    type: 'new',
    title: 'Nuevo Expediente',
    description: 'Subdivisión Lote Chicureo',
    time: 'Hace 4h',
  },
  {
    id: '3',
    type: 'pending',
    title: 'Observación Pendiente',
    description: 'Plano Regulador Sector Norte',
    time: 'Hace 6h',
  },
  {
    id: '4',
    type: 'approved',
    title: 'Recepción Final',
    description: 'Casa Habitación Rol 1234-5',
    time: 'Ayer',
  },
];

const typeStyles = {
  approved: {
    icon: HiOutlineCheckCircle,
    iconClass: 'text-[#10B981]',
    bgClass: 'bg-[#10B981]/10',
  },
  pending: {
    icon: HiOutlineExclamation,
    iconClass: 'text-[#EAB308]',
    bgClass: 'bg-[#EAB308]/10',
  },
  new: {
    icon: HiOutlineDocumentAdd,
    iconClass: 'text-[#3B82F6]',
    bgClass: 'bg-[#3B82F6]/10',
  },
};

export default function ActivityBox() {
  return (
    <SmartBox 
      title="Actividad Reciente" 
      icon={<HiOutlineClock className="w-4 h-4" />}
      className="col-span-12 lg:col-span-4"
    >
      <div className="space-y-3">
        {activities.map((activity) => {
          const style = typeStyles[activity.type];
          const Icon = style.icon;
          
          return (
            <div
              key={activity.id}
              className="flex items-start gap-3 p-3 bg-[#0A0F1E] rounded-xl hover:bg-[#0A0F1E]/80 transition-all cursor-pointer"
            >
              <div className={`w-8 h-8 rounded-lg ${style.bgClass} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-4 h-4 ${style.iconClass}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#F9FAFB] truncate">{activity.title}</p>
                <p className="text-xs text-[#6B7280] truncate">{activity.description}</p>
              </div>
              <span className="text-xs text-[#6B7280] flex-shrink-0">{activity.time}</span>
            </div>
          );
        })}
      </div>

      <button className="mt-4 w-full py-2 text-xs text-[#EAB308] hover:bg-[#EAB308]/10 rounded-lg transition-all">
        Ver toda la actividad
      </button>
    </SmartBox>
  );
}
