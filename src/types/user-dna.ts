/**
 * Constitución v6.0 — Genoma ADN Fractal (tipos canónicos).
 */

export interface CoreProfile {
  /** Derivado de nombres + apellidos (UI); no es campo de expediente. */
  name?: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  nacionalidad: string;
  fechaNacimiento: string | Date;
  /** RUT (expediente): cuerpo + DV, formato libre validado con dígito verificador. */
  rut: string;
  /** FinOps / Constitución v6.0 — enrutado de cascada IA (opcional; ausencia ≈ free). */
  tier?: 'free' | 'pro';
  /** Seguridad administrativa (Cap. 6): ausencia ≠ admin (gate en apps generadas). */
  role?: 'admin' | string;
}

/** Preferencias aisladas por módulo (clave-valor flexible por app). */
export type AppPreferences = Record<string, unknown>;

/** ADN fractal: clave = id de módulo (ej. arquitectura, afiliados). */
export type FractalDNA = Record<string, AppPreferences>;

/** Identidad de usuario = perfil núcleo + preferencias por módulo. */
export interface UserIdentity extends CoreProfile {
  fractalDNA: FractalDNA;
}
