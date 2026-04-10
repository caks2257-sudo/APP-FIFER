import { ZoneInput, ZoneParams, ValidationResult } from "./types";
import { CHICUREO_ZU3, CHICUREO_ZU5 } from "./zones";

export { CHICUREO_ZU3, CHICUREO_ZU5 };
export type { ZoneInput, ZoneParams, ValidationResult };

export class UrbanismEngine {
  private zone: ZoneParams;

  constructor(zone: ZoneParams = CHICUREO_ZU3) {
    this.zone = zone;
  }

  validateZone(input: ZoneInput): ValidationResult {
    const errors: string[] = [];

    if (input.superficieTerreno < this.zone.superficieMinimaTerreno) {
      errors.push(
        `Superficie de terreno (${input.superficieTerreno} m²) es menor al mínimo permitido (${this.zone.superficieMinimaTerreno} m²)`
      );
    }

    if (input.ocupacionSuelo > this.zone.ocupacionMaximaSuelo) {
      errors.push(
        `Ocupación de suelo (${(input.ocupacionSuelo * 100).toFixed(1)}%) excede el máximo permitido (${(this.zone.ocupacionMaximaSuelo * 100).toFixed(1)}%)`
      );
    }

    if (input.distanciamientoFrontal < this.zone.distanciamientoFrontalMinimo) {
      errors.push(
        `Distanciamiento frontal (${input.distanciamientoFrontal} m) es menor al mínimo (${this.zone.distanciamientoFrontalMinimo} m)`
      );
    }

    if (input.distanciamientoLateral < this.zone.distanciamientoLateralMinimo) {
      errors.push(
        `Distanciamiento lateral (${input.distanciamientoLateral} m) es menor al mínimo (${this.zone.distanciamientoLateralMinimo} m)`
      );
    }

    if (input.distanciamientoPosterior < this.zone.distanciamientoPosteriorMinimo) {
      errors.push(
        `Distanciamiento posterior (${input.distanciamientoPosterior} m) es menor al mínimo (${this.zone.distanciamientoPosteriorMinimo} m)`
      );
    }

    if (
      input.alturaMaxima !== undefined &&
      input.alturaMaxima > this.zone.alturaMaxima
    ) {
      errors.push(
        `Altura máxima (${input.alturaMaxima} m) excede el límite (${this.zone.alturaMaxima} m)`
      );
    }

    if (
      input.coeficienteConstructibilidad !== undefined &&
      input.coeficienteConstructibilidad > this.zone.coeficienteConstructibilidad
    ) {
      errors.push(
        `Coeficiente de constructibilidad (${input.coeficienteConstructibilidad}) excede el máximo (${this.zone.coeficienteConstructibilidad})`
      );
    }

    return {
      success: errors.length === 0,
      zona: this.zone.nombre,
      errors,
    };
  }
}
