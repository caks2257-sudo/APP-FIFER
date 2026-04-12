/**
 * Plantilla estructural — Formulario 2.1: Solicitud de Permiso de Edificación (referencia MINVU / práctica municipal Chile).
 * Los nombres de campo son orientativos para borrador técnico; el PDF oficial puede variar por comuna.
 */

export const MINVU_FORM_2_1_ID = 'minvu-2.1-edificacion' as const;

export type MinvuForm21Draft = {
  formulario: {
    codigo: '2.1';
    titulo: 'Solicitud de Permiso de Edificación';
    referenciaNormativa: 'MINVU — Ordenanza General de Urbanismo y Construcciones (marco)';
    notaLegal: string;
  };
  secciones: {
    datosPropietario: {
      razonSocialONombre: string | null;
      rut: string | null;
      domicilio: string | null;
      telefono: string | null;
      email: string | null;
      /** Rol de avalúo fiscal (predio / matriz). */
      rolMatriz: string | null;
    };
    datosArquitecto: {
      nombreCompleto: string | null;
      rut: string | null;
      registroArquitectoSsa: string | null;
      domicilio: string | null;
      email: string | null;
      telefono: string | null;
    };
    caracteristicasProyecto: {
      nombreObra: string | null;
      direccionObra: string | null;
      comuna: string | null;
      region: string | null;
      superficieTerrenoM2: number | null;
      descripcionSintesisProyecto: string | null;
    };
    superficies: {
      superficieEdificadaSobreTerrenoM2: number | null;
      superficieSubterraneaM2: number | null;
      numeroPisosSobreTerreno: number | null;
      detallePorNivel: string | null;
      otrasSuperficiesRelevantes: string | null;
    };
    destinos: {
      destinoPrincipal: string | null;
      destinosSecundarios: string | null;
      coeficienteConstructibilidad: number | null;
      ocupacionSueloPorcentaje: number | null;
    };
  };
  meta: {
    versionPlantilla: string;
    generadoEn: string;
  };
};

const TEMPLATE_VERSION = '1.0.0-minvu-2.1';

/**
 * Esqueleto con todos los campos vacíos (`null` o `""` donde aplique texto) para completado manual.
 */
export function createEmptyMinvu21Draft(generatedAtIso: string): MinvuForm21Draft {
  return {
    formulario: {
      codigo: '2.1',
      titulo: 'Solicitud de Permiso de Edificación',
      referenciaNormativa:
        'MINVU — Ordenanza General de Urbanismo y Construcciones (marco)',
      notaLegal:
        'Borrador generado por FIFER DOM Engine. Debe ser revisado y completado por un arquitecto ' +
        'ante el instrumento de planificación local (LGUC) y requisitos municipales vigentes.',
    },
    secciones: {
      datosPropietario: {
        razonSocialONombre: null,
        rut: null,
        domicilio: null,
        telefono: null,
        email: null,
        rolMatriz: null,
      },
      datosArquitecto: {
        nombreCompleto: null,
        rut: null,
        registroArquitectoSsa: null,
        domicilio: null,
        email: null,
        telefono: null,
      },
      caracteristicasProyecto: {
        nombreObra: null,
        direccionObra: null,
        comuna: null,
        region: null,
        superficieTerrenoM2: null,
        descripcionSintesisProyecto: null,
      },
      superficies: {
        superficieEdificadaSobreTerrenoM2: null,
        superficieSubterraneaM2: null,
        numeroPisosSobreTerreno: null,
        detallePorNivel: '',
        otrasSuperficiesRelevantes: '',
      },
      destinos: {
        destinoPrincipal: null,
        destinosSecundarios: '',
        coeficienteConstructibilidad: null,
        ocupacionSueloPorcentaje: null,
      },
    },
    meta: {
      versionPlantilla: TEMPLATE_VERSION,
      generadoEn: generatedAtIso,
    },
  };
}
