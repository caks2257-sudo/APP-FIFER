import Link from 'next/link'

import Benefits from '@/components/Benefits/Benefits'
import CTA from '@/components/CTA'
import Container from '@/components/Container'
import FAQ from '@/components/FAQ'
import Footer from '@/components/Footer'
import Hero from '@/components/Hero'
import Stats from '@/components/Stats'
import Testimonials from '@/components/Testimonials'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0A0F1E]">
      <header className="border-b border-[#1F2937] bg-[#0A0F1E]/95 backdrop-blur-sm">
        <Container>
          <div className="flex h-14 items-center justify-between sm:h-16">
            <span className="text-sm font-semibold tracking-tight text-[#F9FAFB]">FIFER</span>
            <nav className="flex items-center gap-4">
              <Link
                href="/login"
                className="text-sm font-medium text-[#9CA3AF] transition-colors hover:text-[#EAB308]"
              >
                Iniciar sesión
              </Link>
              <Link
                href="/dashboard"
                className="rounded-lg bg-[#EAB308] px-4 py-2 text-sm font-semibold text-[#0A0F1E] transition-colors hover:bg-[#EAB308]/90"
              >
                Ir al panel
              </Link>
            </nav>
          </div>
        </Container>
      </header>

      <main>
        <Container>
          <div className="py-10 sm:py-14">
            <Hero />
            <Stats />
            <Benefits />
            <Testimonials />
            <FAQ />
            <CTA />
            <Footer />
          </div>
        </Container>
      </main>
    </div>
  )
}
