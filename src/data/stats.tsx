import { BsBarChartFill, BsFillStarFill } from "react-icons/bs";
import { PiGlobeFill } from "react-icons/pi";

import { IStats } from "@/types";

export const stats: IStats[] = [
    {
        title: "1.2M+",
        icon: <BsBarChartFill size={34} className="text-blue-500" />,
        description: "Eventos de contenido deportivo procesados con trazabilidad operacional."
    },
    {
        title: "99.9%",
        icon: <BsFillStarFill size={34} className="text-yellow-500" />,
        description: "Disponibilidad del pipeline de automatizacion en operaciones activas."
    },
    {
        title: "350+",
        icon: <PiGlobeFill size={34} className="text-green-600" />,
        description: "Ligas, creadores y campañas afiliadas gestionadas desde FIFER."
    }
];