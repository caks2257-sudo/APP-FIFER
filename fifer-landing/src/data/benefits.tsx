import { FiBarChart2, FiBriefcase, FiDollarSign, FiLock, FiPieChart, FiShield, FiTarget, FiTrendingUp, FiUser } from "react-icons/fi";

import { IBenefit } from "@/types"

export const benefits: IBenefit[] = [
    {
        title: "Contenido Deportivo Automatizado",
        description: "Convierte ideas en piezas listas para publicar con flujos asistidos por IA orientados a futbol.",
        bullets: [
            {
                title: "Guiones Inteligentes",
                description: "Genera hooks y mensajes optimizados para audiencias deportivas.",
                icon: <FiBarChart2 size={26} />
            },
            {
                title: "Plantillas por Liga",
                description: "Estandariza el contenido por torneo, club o categoria.",
                icon: <FiTarget size={26} />
            },
            {
                title: "Publicacion Programada",
                description: "Activa entregas con trazabilidad desde una sola interfaz.",
                icon: <FiTrendingUp size={26} />
            }
        ],
        imageSrc: "/images/mockup-1.webp"
    },
    {
        title: "Motor de Afiliados para Futbol",
        description: "Orquesta enlaces, campañas y conversiones de afiliados con control operativo en tiempo real.",
        bullets: [
            {
                title: "Tracking de Conversiones",
                description: "Relaciona contenido publicado con resultados de afiliacion.",
                icon: <FiDollarSign size={26} />
            },
            {
                title: "Panel por Campana",
                description: "Analiza rendimiento por creador, liga y canal.",
                icon: <FiBriefcase size={26} />
            },
            {
                title: "Alertas Operativas",
                description: "Detecta caidas de performance y corrige rapido.",
                icon: <FiPieChart size={26} />
            }
        ],
        imageSrc: "/images/mockup-2.webp"
    },
    {
        title: "Seguridad y Gobernanza",
        description: "Proteccion empresarial para datos de afiliados, activos de contenido y accesos de publicacion.",
        bullets: [
            {
                title: "Cifrado de Datos",
                description: "Informacion sensible protegida en transito y almacenamiento.",
                icon: <FiLock size={26} />
            },
            {
                title: "Control por Roles",
                description: "Permisos granulares para ligas, equipos y partners.",
                icon: <FiUser size={26} />
            },
            {
                title: "Monitoreo Continuo",
                description: "Auditoria de eventos para prevenir uso indebido.",
                icon: <FiShield size={26} />
            }
        ],
        imageSrc: "/images/mockup-1.webp"
    },
]