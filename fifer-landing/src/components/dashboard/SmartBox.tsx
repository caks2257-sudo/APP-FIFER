'use client';

import { useState, ReactNode } from 'react';
import { HiOutlineChevronUp, HiOutlineChevronDown, HiOutlineDotsVertical } from 'react-icons/hi';
import clsx from 'clsx';

interface SmartBoxProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  defaultExpanded?: boolean;
  actions?: ReactNode;
}

export default function SmartBox({ 
  title, 
  icon, 
  children, 
  className,
  defaultExpanded = true,
  actions
}: SmartBoxProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div
      className={clsx(
        'bg-[#111827] border border-[#1F2937] rounded-xl shadow-lg shadow-black/10 overflow-hidden transition-all duration-300',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1F2937]">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="w-8 h-8 rounded-xl bg-[#1F2937] flex items-center justify-center text-[#EAB308]">
              {icon}
            </div>
          )}
          <h3 className="text-sm font-semibold text-[#F9FAFB]">{title}</h3>
        </div>
        
        <div className="flex items-center gap-1">
          {actions}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg text-[#6B7280] hover:bg-[#1F2937] hover:text-[#F9FAFB] transition-all"
          >
            {isExpanded ? (
              <HiOutlineChevronUp className="w-4 h-4" />
            ) : (
              <HiOutlineChevronDown className="w-4 h-4" />
            )}
          </button>
          <button className="p-1.5 rounded-lg text-[#6B7280] hover:bg-[#1F2937] hover:text-[#F9FAFB] transition-all">
            <HiOutlineDotsVertical className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div
        className={clsx(
          'transition-all duration-300 overflow-hidden',
          isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  );
}
