'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'

import { createBrowserSupabaseClient } from '@/lib/supabase-ssr/browser'

function sanitizeNextParam(next: string | null): string {
  if (!next || !next.startsWith('/') || next.startsWith('//')) {
    return '/dashboard'
  }
  return next
}

export default function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = sanitizeNextParam(searchParams.get('next'))

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createBrowserSupabaseClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    setLoading(false)

    if (signInError) {
      setError(signInError.message)
      return
    }

    router.replace(nextPath)
    router.refresh()
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-[400px] rounded-xl border border-[#374151] bg-[#111827] p-8 shadow-xl shadow-black/20"
    >
      <div className="mb-8">
        <p className="text-xs font-medium uppercase tracking-wider text-[#EAB308]">Acceso</p>
        <h1 className="mt-2 text-xl font-semibold text-[#F9FAFB]">Iniciar sesión</h1>
        <p className="mt-2 text-sm text-[#9CA3AF]">
          Credenciales corporativas. El acceso al panel está restringido.
        </p>
      </div>

      <div className="space-y-5">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-[#9CA3AF]">
            Correo electrónico
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-[#374151] bg-[#0A0F1E] px-3 py-2.5 text-sm text-[#F9FAFB] placeholder:text-[#6B7280] outline-none ring-[#EAB308]/40 focus:border-[#EAB308]/50 focus:ring-2"
            placeholder="nombre@organizacion.com"
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-[#9CA3AF]">
            Contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-[#374151] bg-[#0A0F1E] px-3 py-2.5 text-sm text-[#F9FAFB] placeholder:text-[#6B7280] outline-none ring-[#EAB308]/40 focus:border-[#EAB308]/50 focus:ring-2"
            placeholder="••••••••"
          />
        </div>
      </div>

      {error ? (
        <p className="mt-4 rounded-lg border border-[#EF4444]/30 bg-[#EF4444]/10 px-3 py-2 text-xs text-[#FCA5A5]" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="mt-6 w-full rounded-lg bg-[#EAB308] py-2.5 text-sm font-semibold text-[#0A0F1E] transition-colors hover:bg-[#EAB308]/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? 'Entrando…' : 'Entrar al panel'}
      </button>

      <p className="mt-6 text-center text-xs text-[#6B7280]">
        <Link href="/" className="text-[#9CA3AF] underline-offset-4 hover:text-[#EAB308] hover:underline">
          Volver al sitio público
        </Link>
      </p>
    </form>
  )
}
