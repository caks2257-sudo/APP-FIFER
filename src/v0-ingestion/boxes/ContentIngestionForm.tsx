'use client';

import { useState } from 'react';
import {
  Upload,
  FileText,
  MapPin,
  Building2,
  Sparkles,
  ChevronDown,
  Plus,
  X,
} from 'lucide-react';
import clsx from 'clsx';

// ============================================
// BDUI Contract Interface
// ============================================
interface FormField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'textarea' | 'file' | 'location';
  placeholder?: string;
  options?: { value: string; label: string }[];
  required?: boolean;
}

interface ContentIngestionData {
  title?: string;
  description?: string;
  fields: FormField[];
  submitLabel?: string;
}

interface ContentIngestionConfig {
  layout?: 'single' | 'two-column';
  showFileUpload?: boolean;
  maxFiles?: number;
}

interface ContentIngestionFormProps {
  data: ContentIngestionData | null;
  config?: ContentIngestionConfig;
  isRefining?: boolean;
  isLocked?: boolean;
}

// ============================================
// Mock Data for Preview
// ============================================
const mockData: ContentIngestionData = {
  title: 'Ingesta de Propiedad',
  description: 'Complete los datos del inmueble para su registro',
  fields: [
    {
      id: 'propertyName',
      label: 'Nombre del Proyecto',
      type: 'text',
      placeholder: 'Ej: Edificio Los Arrayanes',
      required: true,
    },
    {
      id: 'propertyType',
      label: 'Tipo de Propiedad',
      type: 'select',
      options: [
        { value: 'residential', label: 'Residencial' },
        { value: 'commercial', label: 'Comercial' },
        { value: 'industrial', label: 'Industrial' },
        { value: 'mixed', label: 'Uso Mixto' },
      ],
      required: true,
    },
    {
      id: 'location',
      label: 'Ubicacion',
      type: 'location',
      placeholder: 'Ingrese direccion o coordenadas',
      required: true,
    },
    {
      id: 'surface',
      label: 'Superficie (m2)',
      type: 'number',
      placeholder: '0',
      required: true,
    },
    {
      id: 'description',
      label: 'Descripcion',
      type: 'textarea',
      placeholder: 'Detalles adicionales del proyecto...',
    },
    {
      id: 'documents',
      label: 'Documentos',
      type: 'file',
    },
  ],
  submitLabel: 'Registrar Propiedad',
};

const defaultConfig: ContentIngestionConfig = {
  layout: 'single',
  showFileUpload: true,
  maxFiles: 5,
};

// ============================================
// Component
// ============================================
export default function ContentIngestionForm({
  data,
  config,
  isRefining = false,
  isLocked = false,
}: ContentIngestionFormProps) {
  const displayData = data ?? mockData;
  const displayConfig = { ...defaultConfig, ...config };
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);

  const removeFile = (fileName: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f !== fileName));
  };

  const renderField = (field: FormField) => {
    const baseInputClasses =
      'w-full px-4 py-3 bg-[#0A0F1E] border border-[#1E3A5F]/30 rounded-xl text-sm text-[#F9FAFB] placeholder-[#6B7280] focus:outline-none focus:border-[#1E3A5F] focus:ring-1 focus:ring-[#1E3A5F]/50 transition-all';

    switch (field.type) {
      case 'select':
        return (
          <div className="relative">
            <select className={clsx(baseInputClasses, 'appearance-none pr-10')}>
              <option value="">Seleccionar...</option>
              {field.options?.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280] pointer-events-none" />
          </div>
        );

      case 'textarea':
        return (
          <textarea
            className={clsx(baseInputClasses, 'min-h-[100px] resize-none')}
            placeholder={field.placeholder}
            rows={4}
          />
        );

      case 'location':
        return (
          <div className="relative">
            <input
              type="text"
              className={clsx(baseInputClasses, 'pl-10')}
              placeholder={field.placeholder}
            />
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1E3A5F]" />
          </div>
        );

      case 'file':
        return (
          <div>
            <div className="border-2 border-dashed border-[#1E3A5F]/30 rounded-xl p-6 text-center hover:border-[#1E3A5F]/50 transition-all cursor-pointer">
              <Upload className="w-8 h-8 text-[#1E3A5F] mx-auto mb-2" />
              <p className="text-sm text-[#9CA3AF]">
                Arrastre archivos o{' '}
                <span className="text-[#1E3A5F] font-medium">seleccione</span>
              </p>
              <p className="text-xs text-[#6B7280] mt-1">
                PDF, DWG, JPG hasta 25MB
              </p>
            </div>
            {uploadedFiles.length > 0 && (
              <div className="mt-3 space-y-2">
                {uploadedFiles.map((file) => (
                  <div
                    key={file}
                    className="flex items-center justify-between px-3 py-2 bg-[#0A0F1E] rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#1E3A5F]" />
                      <span className="text-xs text-[#F9FAFB]">{file}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(file)}
                      className="p-1 hover:bg-[#1F2937] rounded-md transition-all"
                    >
                      <X className="w-3 h-3 text-[#6B7280]" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'number':
        return (
          <input
            type="number"
            className={baseInputClasses}
            placeholder={field.placeholder}
          />
        );

      default:
        return (
          <input
            type="text"
            className={baseInputClasses}
            placeholder={field.placeholder}
          />
        );
    }
  };

  return (
    <div
      className={clsx(
        'relative bg-[#111827] border rounded-xl overflow-hidden transition-all duration-300',
        isRefining
          ? 'border-[#1E3A5F] animate-pulse shadow-[0_0_20px_rgba(30,58,95,0.2)]'
          : 'border-[#1F2937]',
        isLocked && 'opacity-60 pointer-events-none'
      )}
    >
      {/* Refining Indicator */}
      {isRefining && (
        <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-1 bg-[#1E3A5F]/20 rounded-lg z-10">
          <Sparkles className="w-3 h-3 text-[#3B82F6] animate-spin" />
          <span className="text-xs text-[#3B82F6] font-medium">Analizando</span>
        </div>
      )}

      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-[#1F2937]">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1E3A5F]/20 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-[#3B82F6]" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-[#F9FAFB]">
              {displayData.title}
            </h3>
            <p className="text-xs text-[#6B7280] mt-0.5">
              {displayData.description}
            </p>
          </div>
        </div>
      </div>

      {/* Form Fields */}
      <div className="p-5">
        <div
          className={clsx(
            'space-y-5',
            displayConfig.layout === 'two-column' && 'grid grid-cols-2 gap-5 space-y-0'
          )}
        >
          {displayData.fields.map((field) => (
            <div
              key={field.id}
              className={clsx(
                field.type === 'textarea' || field.type === 'file'
                  ? 'col-span-2'
                  : ''
              )}
            >
              <label className="block text-xs font-medium text-[#9CA3AF] mb-2">
                {field.label}
                {field.required && (
                  <span className="text-[#EF4444] ml-0.5">*</span>
                )}
              </label>
              {renderField(field)}
            </div>
          ))}
        </div>

        {/* Submit Button */}
        <button
          type="button"
          className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#1E3A5F] hover:bg-[#1E3A5F]/80 text-[#F9FAFB] text-sm font-medium rounded-xl transition-all"
        >
          <Plus className="w-4 h-4" />
          {displayData.submitLabel}
        </button>
      </div>
    </div>
  );
}
