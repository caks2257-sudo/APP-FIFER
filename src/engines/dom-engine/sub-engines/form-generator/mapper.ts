import {
  createEmptyMinvu21Draft,
  MINVU_FORM_2_1_ID,
  type MinvuForm21Draft,
} from './templates/minvu_2_1_edificacion';

/**
 * Entrada mínima desde el Hub DOM (expediente / proyecto).
 * Campos omitidos se rellenan como null o "" en el borrador.
 */
export type FormGeneratorProjectInput = {
  rolAvaluo?: string | null;
  nombrePropietario?: string | null;
  superficieTerreno?: number | null;
  destinoPrincipal?: string | null;
  nombreArquitecto?: string | null;
  comuna?: string | null;
  region?: string | null;
  direccionObra?: string | null;
};

export type FormGeneratorFormType = typeof MINVU_FORM_2_1_ID;

function coalesce<T>(v: T | null | undefined, fallback: T): T {
  if (v === undefined || v === null) return fallback;
  return v;
}

function applyMinvu21Project(
  draft: MinvuForm21Draft,
  project: FormGeneratorProjectInput,
): MinvuForm21Draft {
  const p = draft.secciones.datosPropietario;
  const a = draft.secciones.datosArquitecto;
  const c = draft.secciones.caracteristicasProyecto;
  const d = draft.secciones.destinos;

  if (project.rolAvaluo != null && String(project.rolAvaluo).trim() !== '') {
    p.rolMatriz = String(project.rolAvaluo).trim();
  }
  if (project.nombrePropietario != null && String(project.nombrePropietario).trim() !== '') {
    p.razonSocialONombre = String(project.nombrePropietario).trim();
  }
  if (project.nombreArquitecto != null && String(project.nombreArquitecto).trim() !== '') {
    a.nombreCompleto = String(project.nombreArquitecto).trim();
  }
  if (project.comuna != null && String(project.comuna).trim() !== '') {
    c.comuna = String(project.comuna).trim();
  }
  if (project.region != null && String(project.region).trim() !== '') {
    c.region = String(project.region).trim();
  }
  if (project.direccionObra != null && String(project.direccionObra).trim() !== '') {
    c.direccionObra = String(project.direccionObra).trim();
  }
  if (project.superficieTerreno != null && !Number.isNaN(Number(project.superficieTerreno))) {
    c.superficieTerrenoM2 = Number(project.superficieTerreno);
  }
  if (project.destinoPrincipal != null && String(project.destinoPrincipal).trim() !== '') {
    d.destinoPrincipal = String(project.destinoPrincipal).trim();
  }

  return draft;
}

/**
 * Combina la plantilla oficial (MINVU 2.1) con datos de proyecto.
 * Campos no proveídos permanecen en `null` o cadena vacía según la plantilla.
 */
export function generateFormDraft(
  formType: FormGeneratorFormType,
  projectData: FormGeneratorProjectInput,
  options?: { generatedAt?: string },
): MinvuForm21Draft {
  if (formType !== MINVU_FORM_2_1_ID) {
    throw new Error(
      `[form-generator] Tipo de formulario no soportado: ${String(formType)}`,
    );
  }
  const iso = coalesce(options?.generatedAt, new Date().toISOString());
  const base = createEmptyMinvu21Draft(iso);
  return applyMinvu21Project(base, projectData);
}
