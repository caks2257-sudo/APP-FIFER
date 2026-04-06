import { IPricing } from "@/types";

export const tiers: IPricing[] = [
    {
        name: 'Starter',
        price: 49,
        features: [
            'Automatizacion base de contenido',
            'Hasta 3 operadores',
            'Integracion TikTok',
            'Soporte por email',
        ],
    },
    {
        name: 'Pro',
        price: 149,
        features: [
            'Pipeline completo de afiliados',
            'Hasta 15 operadores',
            'Analitica por liga y campana',
            'Soporte prioritario',
            'Automatizaciones avanzadas',
        ],
    },
    {
        name: 'Enterprise',
        price: 'Custom',
        features: [
            'Operacion multi-liga',
            'Usuarios ilimitados',
            'Integraciones dedicadas',
            'SLA empresarial',
            'Seguridad y compliance extendidos',
            'Onboarding personalizado',
        ],
    },
]