export interface ZoneInput {
  superficieTerreno: number;
  ocupacionSuelo: number;
  distanciamientoFrontal: number;
  distanciamientoLateral: number;
  distanciamientoPosterior: number;
  alturaMaxima?: number;
  coeficienteConstructibilidad?: number;
}

export interface ZoneParams {
  nombre: string;
  superficieMinimaTerreno: number;
  ocupacionMaximaSuelo: number;
  distanciamientoFrontalMinimo: number;
  distanciamientoLateralMinimo: number;
  distanciamientoPosteriorMinimo: number;
  alturaMaxima: number;
  coeficienteConstructibilidad: number;
}

export interface ValidationResult {
  success: boolean;
  zona: string;
  errors: string[];
}
