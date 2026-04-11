'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import {
  perfilExpedienteSchema,
  type PerfilExpedienteFormValues,
} from '@/types/schemas';
import { useUserDnaStore } from '@/store/useUserDnaStore';

const fieldClass =
  'mt-1 w-full rounded-lg border border-[#1E293B] bg-[#111827] px-3 py-2.5 text-sm text-[#F9FAFB] shadow-inner placeholder:text-[#64748B] focus:border-[#EAB308] focus:outline-none focus:ring-2 focus:ring-[#EAB308]/35';

const labelClass = 'block text-xs font-medium uppercase tracking-wide text-[#94A3B8]';

function toDateInputValue(v: string | Date | undefined): string {
  if (v == null) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  const d = new Date(v);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return '';
}

export default function ProfileExpedienteForm() {
  const nombres = useUserDnaStore((s) => s.nombres);
  const apellidoPaterno = useUserDnaStore((s) => s.apellidoPaterno);
  const apellidoMaterno = useUserDnaStore((s) => s.apellidoMaterno);
  const nacionalidad = useUserDnaStore((s) => s.nacionalidad);
  const fechaNacimiento = useUserDnaStore((s) => s.fechaNacimiento);
  const rut = useUserDnaStore((s) => s.rut);
  const updateCoreProfile = useUserDnaStore((s) => s.updateCoreProfile);
  const [saveError, setSaveError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitSuccessful },
    reset,
  } = useForm<PerfilExpedienteFormValues>({
    resolver: zodResolver(perfilExpedienteSchema),
    defaultValues: {
      nombres,
      apellidoPaterno,
      apellidoMaterno,
      nacionalidad,
      fechaNacimiento: toDateInputValue(fechaNacimiento),
      rut,
    },
  });

  useEffect(() => {
    const syncFromStore = () => {
      const s = useUserDnaStore.getState();
      reset({
        nombres: s.nombres,
        apellidoPaterno: s.apellidoPaterno,
        apellidoMaterno: s.apellidoMaterno,
        nacionalidad: s.nacionalidad,
        fechaNacimiento: toDateInputValue(s.fechaNacimiento),
        rut: s.rut ?? '',
      });
    };
    if (useUserDnaStore.persist.hasHydrated()) {
      syncFromStore();
    }
    return useUserDnaStore.persist.onFinishHydration(syncFromStore);
  }, [reset]);

  const onSubmit = async (data: PerfilExpedienteFormValues) => {
    setSaveError(null);
    try {
      const res = await fetch('/api/v1/perfil', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (res.status === 401) {
        setSaveError('Sesión expirada. Inicie sesión de nuevo.');
        return;
      }
      if (res.status === 404) {
        setSaveError(
          'No hay fila de usuario en Prisma para esta cuenta. Ejecute el seed o sincronice el email.',
        );
        return;
      }
      if (res.status === 409) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setSaveError(j.error ?? 'RUT ya asignado a otro expediente.');
        return;
      }
      if (res.status === 422) {
        setSaveError('Los datos no pasaron la validación del servidor.');
        return;
      }
      if (!res.ok) {
        setSaveError('No se pudo guardar el expediente en el servidor.');
        return;
      }
      updateCoreProfile({
        nombres: data.nombres,
        apellidoPaterno: data.apellidoPaterno,
        apellidoMaterno: data.apellidoMaterno,
        nacionalidad: data.nacionalidad,
        fechaNacimiento: data.fechaNacimiento,
        rut: data.rut.trim(),
      });
      reset(data);
    } catch {
      setSaveError('Error de red al contactar el API.');
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-8"
      noValidate
    >
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="perfil-nombres" className={labelClass}>
            Nombres
          </label>
          <input
            id="perfil-nombres"
            type="text"
            autoComplete="given-name"
            className={fieldClass}
            aria-invalid={errors.nombres ? 'true' : 'false'}
            {...register('nombres')}
          />
          {errors.nombres && (
            <p className="mt-1 text-xs text-[#EAB308]" role="alert">
              {errors.nombres.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="perfil-apellido-paterno" className={labelClass}>
            Apellido paterno
          </label>
          <input
            id="perfil-apellido-paterno"
            type="text"
            autoComplete="additional-name"
            className={fieldClass}
            aria-invalid={errors.apellidoPaterno ? 'true' : 'false'}
            {...register('apellidoPaterno')}
          />
          {errors.apellidoPaterno && (
            <p className="mt-1 text-xs text-[#EAB308]" role="alert">
              {errors.apellidoPaterno.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="perfil-apellido-materno" className={labelClass}>
            Apellido materno
          </label>
          <input
            id="perfil-apellido-materno"
            type="text"
            autoComplete="family-name"
            className={fieldClass}
            aria-invalid={errors.apellidoMaterno ? 'true' : 'false'}
            {...register('apellidoMaterno')}
          />
          {errors.apellidoMaterno && (
            <p className="mt-1 text-xs text-[#EAB308]" role="alert">
              {errors.apellidoMaterno.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="perfil-nacionalidad" className={labelClass}>
            Nacionalidad
          </label>
          <input
            id="perfil-nacionalidad"
            type="text"
            autoComplete="country-name"
            className={fieldClass}
            aria-invalid={errors.nacionalidad ? 'true' : 'false'}
            {...register('nacionalidad')}
          />
          {errors.nacionalidad && (
            <p className="mt-1 text-xs text-[#EAB308]" role="alert">
              {errors.nacionalidad.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="perfil-nacimiento" className={labelClass}>
            Fecha de nacimiento
          </label>
          <input
            id="perfil-nacimiento"
            type="date"
            className={fieldClass}
            aria-invalid={errors.fechaNacimiento ? 'true' : 'false'}
            {...register('fechaNacimiento')}
          />
          {errors.fechaNacimiento && (
            <p className="mt-1 text-xs text-[#EAB308]" role="alert">
              {errors.fechaNacimiento.message}
            </p>
          )}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="perfil-rut" className={labelClass}>
            RUT
          </label>
          <input
            id="perfil-rut"
            type="text"
            inputMode="text"
            autoComplete="off"
            placeholder="12.345.678-5"
            className={fieldClass}
            aria-invalid={errors.rut ? 'true' : 'false'}
            {...register('rut')}
          />
          {errors.rut && (
            <p className="mt-1 text-xs text-[#EAB308]" role="alert">
              {errors.rut.message}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 border-t border-[#1E293B] pt-6">
        <button
          type="submit"
          className="rounded-lg bg-[#EAB308] px-5 py-2.5 text-sm font-semibold text-[#0A0F1E] shadow-sm transition hover:bg-[#EAB308]/90 focus:outline-none focus:ring-2 focus:ring-[#EAB308] focus:ring-offset-2 focus:ring-offset-[#0A0F1E]"
        >
          Guardar expediente
        </button>
        {saveError && (
          <p className="text-sm text-[#EAB308]" role="alert">
            {saveError}
          </p>
        )}
        {isSubmitSuccessful && !saveError && (
          <span className="text-sm text-[#94A3B8]" role="status">
            Expediente persistido en base de datos y reflejado en este dispositivo.
          </span>
        )}
      </div>
    </form>
  );
}
