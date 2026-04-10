import { ITestimonial } from "@/types";
import { siteDetails } from "./siteDetails";

export const testimonials: ITestimonial[] = [
    {
        name: 'Carlos Mendez',
        role: 'Director de Liga Regional',
        message: `${siteDetails.siteName} nos ayudo a escalar la produccion de contenido deportivo sin ampliar el equipo operativo.`,
        avatar: '/images/testimonial-1.webp',
    },
    {
        name: 'Laura Pereira',
        role: 'Affiliate Manager',
        message: `Con ${siteDetails.siteName} conectamos TikTok y afiliados en un solo flujo, con mejor trazabilidad de conversiones.`,
        avatar: '/images/testimonial-2.webp',
    },
    {
        name: 'Andres Ruiz',
        role: 'Head of Growth',
        message: `${siteDetails.siteName} simplifico nuestra operacion de marketing deportivo con automatizaciones confiables y reportes claros.`,
        avatar: '/images/testimonial-3.webp',
    },
];