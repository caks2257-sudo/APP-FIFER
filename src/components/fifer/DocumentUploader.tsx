'use client'

import { UploadCloud, Loader2, FileUp } from 'lucide-react'
import {
  useCallback,
  useRef,
  useState,
  useTransition,
  type DragEvent,
  type ChangeEvent,
} from 'react'

import { uploadDocumentAction } from '@/actions/document-actions'
import type { FiferDocumentRow } from '@/lib/storage'

export type DocumentUploaderProps = {
  mainApp: string
  subApp?: string | null
  bucketName?: string
  acceptedTypes?: string
  onUploadSuccess?: (document: FiferDocumentRow) => void
  className?: string
}

const FIELD_NAME = 'file'

export function DocumentUploader({
  mainApp,
  subApp,
  bucketName = 'fifer-documents',
  acceptedTypes = 'application/pdf,image/*',
  onUploadSuccess,
  className = '',
}: DocumentUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isPending, startTransition] = useTransition()
  const [isDragging, setIsDragging] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(
    null,
  )

  const runUpload = useCallback(
    (file: File) => {
      setFeedback(null)
      startTransition(async () => {
        const formData = new FormData()
        formData.append(FIELD_NAME, file)
        const result = await uploadDocumentAction(
          formData,
          mainApp,
          bucketName,
          subApp != null && subApp !== '' ? { subApp } : undefined,
        )

        if (result.success && result.data) {
          setFeedback({ type: 'ok', text: 'Documento subido correctamente.' })
          onUploadSuccess?.(result.data)
          if (inputRef.current) {
            inputRef.current.value = ''
          }
        } else {
          setFeedback({
            type: 'err',
            text: result.error ?? 'No se pudo completar la subida.',
          })
        }
      })
    },
    [mainApp, subApp, bucketName, onUploadSuccess],
  )

  const onInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        runUpload(file)
      }
    },
    [runUpload],
  )

  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const onDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)
      const file = e.dataTransfer.files?.[0]
      if (file) {
        runUpload(file)
      }
    },
    [runUpload],
  )

  return (
    <div className={className}>
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
        onClick={() => inputRef.current?.click()}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={[
          'relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 transition-colors',
          isDragging
            ? 'border-sky-500/80 bg-sky-500/5'
            : 'border-zinc-300 bg-zinc-50/50 hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900/40 dark:hover:border-zinc-500 dark:hover:bg-zinc-900/60',
          isPending ? 'pointer-events-none opacity-70' : '',
        ].join(' ')}
      >
        <input
          ref={inputRef}
          type="file"
          name={FIELD_NAME}
          accept={acceptedTypes}
          className="sr-only"
          disabled={isPending}
          onChange={onInputChange}
          aria-label="Seleccionar archivo para subir"
        />

        {isPending ? (
          <Loader2 className="h-10 w-10 animate-spin text-sky-600 dark:text-sky-400" />
        ) : (
          <UploadCloud className="h-10 w-10 text-zinc-500 dark:text-zinc-400" />
        )}

        <div className="text-center">
          <p className="flex items-center justify-center gap-2 text-sm font-medium text-zinc-800 dark:text-zinc-100">
            <FileUp className="h-4 w-4 shrink-0" />
            {isPending ? 'Subiendo…' : 'Arrastra un archivo o haz clic para elegir'}
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            App: <span className="font-mono">{mainApp}</span>
            {subApp ? (
              <>
                {' '}
                · <span className="font-mono">{subApp}</span>
              </>
            ) : null}
            {bucketName !== 'fifer-documents' ? (
              <>
                {' '}
                · bucket <span className="font-mono">{bucketName}</span>
              </>
            ) : null}
          </p>
        </div>
      </div>

      {feedback ? (
        <p
          className={
            feedback.type === 'ok'
              ? 'mt-3 text-sm text-emerald-600 dark:text-emerald-400'
              : 'mt-3 text-sm text-red-600 dark:text-red-400'
          }
          role="status"
        >
          {feedback.text}
        </p>
      ) : null}
    </div>
  )
}
