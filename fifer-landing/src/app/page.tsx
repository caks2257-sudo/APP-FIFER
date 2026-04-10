import Hero from "@/components/Hero";
import Testimonials from "@/components/Testimonials";
import Pricing from "@/components/Pricing/Pricing";
import FAQ from "@/components/FAQ";
import Logos from "@/components/Logos";
import Benefits from "@/components/Benefits/Benefits";
import Container from "@/components/Container";
import Section from "@/components/Section";
import Stats from "@/components/Stats";
import CTA from "@/components/CTA";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const HomePage: React.FC = () => {
  return (
    <>
      <Header />
      <main>
      <Hero />
      <Logos />
      <Container>
        <Benefits />

        <Section
          id="pricing"
          title="Planes FIFER"
          description="Escala automatizacion deportiva y afiliados con planes claros."
        >
          <Pricing />
        </Section>

        <Section
          id="testimonials"
          title="Equipos que ya operan con FIFER"
          description="Resultados reales en operaciones de contenido y afiliacion."
        >
          <Testimonials />
        </Section>

        <FAQ />

        <Stats />
        
        <CTA />
      </Container>
      </main>
      <Footer />
    </>
  );
};

export default HomePage;
