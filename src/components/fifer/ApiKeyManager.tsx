'use client'

import {
  createApiKeyAction,
  getApiKeysAction,
  type ApiKeyListItem,
} from '@/actions/api-key-actions'
import type { InternalApiKeyScope } from '@/lib/api-manager'
import { Check, Copy, KeyRound, Loader2, Shield } from 'lucide-react'
import { useCallback, useEffect, useState, useTransition } from 'react'

const TARGET_PRESETS = ['dom', 'normativa', 'comms'] as const

function formatCreatedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString('es-CL', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

export function ApiKeyManager() {
  const [keys, setKeys] = useState<ApiKeyListItem[]>([])
  const [listError, setListError] = useState<string | null>(null)
  const [targetPreset, setTargetPreset] = useState<string>('normativa')
  const [customTarget, setCustomTarget] = useState('')
  const [scope, setScope] = useState<InternalApiKeyScope>('READ_ONLY')
  const [label, setLabel] = useState('')
  const [isPending, startTransition] = useTransition()
  const [isLoadingList, setIsLoadingList] = useState(true)
  const [formError, setFormError] = useState<string | null>(null)
  const [secretModalOpen, setSecretModalOpen] = useState(false)
  const [oneTimeSecret, setOneTimeSecret] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const refreshKeys = useCallback(async () => {
    setIsLoadingList(true)
    setListError(null)
    const res = await getApiKeysAction()
    setIsLoadingList(false)
    if (res.success) {
      setKeys(res.keys)
    } else {
      setListError(res.error)
    }
  }, [])

  useEffect(() => {
    void refreshKeys()
  }, [refreshKeys])

  const resolvedTarget =
    targetPreset === '__custom__' ? customTarget.trim() : targetPreset

  const onCreate = () => {
    setFormError(null)
    startTransition(async () => {
      const result = await createApiKeyAction({
        targetAppOrEngine: resolvedTarget,
        scope,
        name: label.trim() || undefined,
      })
      if (!result.success) {
        setFormError(result.error)
        return
      }
      setOneTimeSecret(result.apiKey)
      setSecretModalOpen(true)
      setCopied(false)
      setLabel('')
      await refreshKeys()
    })
  }

  const closeSecretModal = () => {
    setSecretModalOpen(false)
    setOneTimeSecret(null)
    setCopied(false)
  }

  const copySecret = async () => {
    if (!oneTimeSecret) return
    try {
      await navigator.clipboard.writeText(oneTimeSecret)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setFormError('No se pudo copiar al portapapeles.')
    }
  }

  return (
    <section
      className="rounded-xl border border-slate-400/25 bg-gradient-to-b from-slate-950/90 via-slate-950/80 to-slate-900/70 px-4 py-5 shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset] md:px-6"
      aria-labelledby="api-key-manager-heading"
    >
      <div className="mb-5 flex flex-wrap items-start gap-3 border-b border-slate-500/20 pb-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-sky-200/15 bg-slate-900/80 text-sky-100/90">
          <KeyRound className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <h2
            id="api-key-manager-heading"
            className="text-base font-semibold tracking-tight text-slate-100"
          >
            Torre de control · API interna
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-400">
            Emite llaves por motor o app destino. El secreto completo solo se muestra una vez al
            crearla; guárdala de forma segura.
          </p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_minmax(280px,340px)]">
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <Shield className="h-3.5 w-3.5 text-sky-200/50" aria-hidden />
            Llaves activas
          </h3>
          {isLoadingList ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Cargando…
            </div>
          ) : listError ? (
            <p className="text-sm text-rose-300/90" role="alert">
              {listError}
            </p>
          ) : keys.length === 0 ? (
            <p className="text-sm text-slate-500">
              No hay llaves registradas para este espacio. Crea la primera con el formulario.
            </p>
          ) : (
            <ul className="space-y-2">
              {keys.map((k) => (
                <li
                  key={k.id}
                  className="rounded-lg border border-slate-500/20 bg-slate-900/40 px-3 py-2.5"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-medium text-slate-200">{k.name}</span>
                    <span className="font-mono text-[11px] text-sky-200/70">
                      {k.targetAppOrEngine}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                    <code className="rounded bg-slate-950/80 px-1.5 py-0.5 text-slate-300">
                      {k.keyPreview}
                    </code>
                    <span>{k.scope === 'FULL_ACCESS' ? 'Acceso completo' : 'Solo lectura'}</span>
                    <span className="text-slate-600">{formatCreatedAt(k.createdAt)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-slate-400/20 bg-slate-950/50 p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Nueva llave
          </h3>
          <div className="space-y-3">
            <div>
              <label htmlFor="iak-target" className="mb-1 block text-xs text-slate-500">
                Destino (motor / app)
              </label>
              <select
                id="iak-target"
                value={targetPreset}
                onChange={(e) => setTargetPreset(e.target.value)}
                className="w-full rounded-md border border-slate-500/30 bg-slate-950/80 px-3 py-2 text-sm text-slate-200 outline-none ring-sky-200/30 focus:ring-2"
              >
                {TARGET_PRESETS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
                <option value="__custom__">Otro (manual)…</option>
              </select>
            </div>
            {targetPreset === '__custom__' && (
              <div>
                <label htmlFor="iak-custom" className="mb-1 block text-xs text-slate-500">
                  Slug personalizado
                </label>
                <input
                  id="iak-custom"
                  type="text"
                  value={customTarget}
                  onChange={(e) => setCustomTarget(e.target.value)}
                  placeholder="ej. mi-engine"
                  className="w-full rounded-md border border-slate-500/30 bg-slate-950/80 px-3 py-2 font-mono text-sm text-slate-200 outline-none ring-sky-200/30 placeholder:text-slate-600 focus:ring-2"
                />
              </div>
            )}
            <div>
              <label htmlFor="iak-scope" className="mb-1 block text-xs text-slate-500">
                Alcance
              </label>
              <select
                id="iak-scope"
                value={scope}
                onChange={(e) =>
                  setScope(e.target.value as InternalApiKeyScope)
                }
                className="w-full rounded-md border border-slate-500/30 bg-slate-950/80 px-3 py-2 text-sm text-slate-200 outline-none ring-sky-200/30 focus:ring-2"
              >
                <option value="READ_ONLY">READ_ONLY</option>
                <option value="FULL_ACCESS">FULL_ACCESS</option>
              </select>
            </div>
            <div>
              <label htmlFor="iak-label" className="mb-1 block text-xs text-slate-500">
                Etiqueta (opcional)
              </label>
              <input
                id="iak-label"
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="p. ej. Normativa — staging"
                className="w-full rounded-md border border-slate-500/30 bg-slate-950/80 px-3 py-2 text-sm text-slate-200 outline-none ring-sky-200/30 placeholder:text-slate-600 focus:ring-2"
              />
            </div>
            {formError && (
              <p className="text-sm text-rose-300/90" role="alert">
                {formError}
              </p>
            )}
            <button
              type="button"
              onClick={onCreate}
              disabled={
                isPending || (targetPreset === '__custom__' && !customTarget.trim())
              }
              className="flex w-full items-center justify-center gap-2 rounded-md border border-sky-200/25 bg-slate-800/80 px-4 py-2.5 text-sm font-medium text-slate-100 transition hover:border-sky-200/40 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Generando…
                </>
              ) : (
                <>
                  <KeyRound className="h-4 w-4 text-sky-200/80" aria-hidden />
                  Generar llave
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {secretModalOpen && oneTimeSecret && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="iak-secret-title"
        >
          <div className="max-w-lg rounded-xl border border-slate-300/25 bg-gradient-to-b from-slate-900 to-slate-950 p-5 shadow-xl shadow-slate-950/50">
            <h2
              id="iak-secret-title"
              className="text-base font-semibold tracking-tight text-slate-100"
            >
              Secreto generado (una sola vez)
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Copia esta llave ahora. No volverá a mostrarse en este panel; solo verás un prefijo en
              la lista.
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-start">
              <code className="block flex-1 break-all rounded-lg border border-slate-500/25 bg-slate-950/90 px-3 py-2.5 font-mono text-xs leading-relaxed text-sky-100/90">
                {oneTimeSecret}
              </code>
              <button
                type="button"
                onClick={() => void copySecret()}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-400/30 bg-slate-800/90 px-4 py-2 text-sm text-slate-100 hover:bg-slate-800"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-400" aria-hidden />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" aria-hidden />
                    Copiar
                  </>
                )}
              </button>
            </div>
            <button
              type="button"
              onClick={closeSecretModal}
              className="mt-5 w-full rounded-lg border border-slate-500/30 bg-slate-900/80 py-2.5 text-sm text-slate-300 hover:bg-slate-900"
            >
              He guardado el secreto
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
