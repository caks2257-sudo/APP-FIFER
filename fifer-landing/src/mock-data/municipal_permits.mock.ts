/**
 * Fixtures — expedientes municipales y permisos de construcción (solo dev/demo).
 */

export type PermitApprovalStatus =
  | "borrador"
  | "en_revision"
  | "observado"
  | "aprobado"
  | "rechazado";

export type MunicipalPermitRecord = {
  id: string;
  expediente: string;
  tipoTramite: string;
  estado: PermitApprovalStatus;
  municipio: string;
  /** ISO 8601 (fecha de ingreso al sistema municipal). */
  fechaPresentacion: string;
  /** ISO 8601 — ausente si aún no hay resolución. */
  fechaResolucion?: string;
  /** Antecedente breve para demos (no PII). */
  observacion?: string;
};

export const municipalPermitsMock: readonly MunicipalPermitRecord[] = [
  {
    id: "mp-001",
    expediente: "DOM-2024-11847",
    tipoTramite: "Permiso de edificación — ampliación 2.º piso",
    estado: "aprobado",
    municipio: "Vitacura",
    fechaPresentacion: "2024-03-12T10:30:00.000Z",
    fechaResolucion: "2024-05-02T14:15:00.000Z",
    observacion: "Condicionada a informe de compatibilidad estructural.",
  },
  {
    id: "mp-002",
    expediente: "DOM-2025-00402",
    tipoTramite: "Recepción final de obra menor — muros perimetrales",
    estado: "en_revision",
    municipio: "Las Condes",
    fechaPresentacion: "2025-01-18T09:00:00.000Z",
    observacion: "Pendiente visita de terreno coordinada.",
  },
  {
    id: "mp-003",
    expediente: "DOM-2023-9910",
    tipoTramite: "Demolición parcial — retiro de cobertura metálica",
    estado: "observado",
    municipio: "Providencia",
    fechaPresentacion: "2023-11-05T11:45:00.000Z",
    fechaResolucion: "2024-02-20T16:40:00.000Z",
    observacion: "Subsanar planimetría de evacuación y señalética.",
  },
  {
    id: "mp-004",
    expediente: "DOM-2024-22011",
    tipoTramite: "Permiso de construcción nueva — vivienda unifamiliar",
    estado: "borrador",
    municipio: "La Reina",
    fechaPresentacion: "2024-12-01T08:00:00.000Z",
  },
  {
    id: "mp-005",
    expediente: "DOM-2022-44088",
    tipoTramite: "Modificación de gálibos — anteproyecto de ampliación",
    estado: "rechazado",
    municipio: "Ñuñoa",
    fechaPresentacion: "2022-08-22T13:20:00.000Z",
    fechaResolucion: "2023-01-10T10:00:00.000Z",
    observacion: "Incompatibilidad con normativa de retiros frontales vigente.",
  },
  {
    id: "mp-006",
    expediente: "DOM-2025-03177",
    tipoTramite: "Consulta de factibilidad — cambio de uso a comercio liviano",
    estado: "aprobado",
    municipio: "Santiago",
    fechaPresentacion: "2025-02-03T15:30:00.000Z",
    fechaResolucion: "2025-03-28T12:00:00.000Z",
  },
];
