import { ZoneParams } from "./types";

/**
 * Parámetros normativos de la zona ZU-3 de Chicureo (Colina).
 * Basados en el Plan Regulador Comunal de Colina — zona residencial mixta.
 */
export const CHICUREO_ZU3: ZoneParams = {
  nombre: "Chicureo ZU-3 (Colina)",
  superficieMinimaTerreno: 5000,
  ocupacionMaximaSuelo: 0.2,
  distanciamientoFrontalMinimo: 5,
  distanciamientoLateralMinimo: 3,
  distanciamientoPosteriorMinimo: 3,
  alturaMaxima: 10.5,
  coeficienteConstructibilidad: 0.4,
};

/**
 * Parámetros normativos de la zona ZU-5 de Chicureo (Colina).
 * Zona residencial de densidad media.
 */
export const CHICUREO_ZU5: ZoneParams = {
  nombre: "Chicureo ZU-5 (Colina)",
  superficieMinimaTerreno: 1000,
  ocupacionMaximaSuelo: 0.4,
  distanciamientoFrontalMinimo: 3,
  distanciamientoLateralMinimo: 2,
  distanciamientoPosteriorMinimo: 2,
  alturaMaxima: 9,
  coeficienteConstructibilidad: 0.8,
};
