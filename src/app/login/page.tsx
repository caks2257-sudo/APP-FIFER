import { Suspense } from 'react'

import LoginForm from './login-form'

function LoginFallback() {
  return (
    <div className="h-[420px] w-full max-w-[400px] animate-pulse rounded-xl border border-[#374151] bg-[#111827]/80" />
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#0A0F1E]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(234,179,8,0.12),transparent)]" aria-hidden />
      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col items-center justify-center px-4 py-16 sm:px-6">
        <Suspense fallback={<LoginFallback />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
