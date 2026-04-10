import DashboardLayout from '@/components/dashboard/DashboardLayout';
import Hero from '@/components/Hero';
import Testimonials from '@/components/Testimonials';
import Pricing from '@/components/Pricing/Pricing';
import FAQ from '@/components/FAQ';
import Logos from '@/components/Logos';
import Benefits from '@/components/Benefits/Benefits';
import Container from '@/components/Container';
import Section from '@/components/Section';
import Stats from '@/components/Stats';
import CTA from '@/components/CTA';
import Footer from '@/components/Footer';
import { StatsBox, ChartBox, GhostBox, ActivityBox } from '@/boxes/registry';

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <div className="space-y-10">
        {/* Encabezado de página — mismo fondo que el shell (#0A0F1E vía layout) */}
        <div>
          <h1 className="text-2xl font-bold text-[#F9FAFB] mb-1">Dashboard</h1>
          <p className="text-sm text-[#6B7280]">
            Gestión integral de expedientes, trámites y permisos de construcción
          </p>
        </div>

        {/* Smart Boxes — grid 12 columnas (Nevado Técnico, bordes rounded-xl en SmartBox) */}
        <div className="grid grid-cols-12 gap-4">
          <StatsBox />
          <ChartBox />
          <GhostBox />
          <ActivityBox />
        </div>

        {/* Flujo v0: marketing dentro del dashboard (sin Header duplicado; chrome en Sidebar/Topbar) */}
        <div className="border-t border-[#1F2937] pt-10">
          <Hero />
          <Logos />
          <Container>
            <Benefits />

            <Section
              id="pricing"
              title="Planes FIFER"
              description="Escala automatización deportiva y afiliados con planes claros."
            >
              <Pricing />
            </Section>

            <Section
              id="testimonials"
              title="Equipos que ya operan con FIFER"
              description="Resultados reales en operaciones de contenido y afiliación."
            >
              <Testimonials />
            </Section>

            <FAQ />

            <Stats />

            <CTA />
          </Container>
          <Footer />
        </div>
      </div>
    </DashboardLayout>
  );
}
