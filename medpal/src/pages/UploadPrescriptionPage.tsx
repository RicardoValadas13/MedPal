import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, FileText, ArrowRight, X, Loader2, Upload, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { pt } from '../i18n/pt'
import { runOcr, isOcrSupported } from '../lib/ocr'

type UploadState = 'idle' | 'uploading' | 'processing' | 'invalid' | 'error'

function formatFileName(name: string, maxLen = 36): string {
  if (name.length <= maxLen) return name
  const ext = name.includes('.') ? name.slice(name.lastIndexOf('.')) : ''
  const base = name.slice(0, name.lastIndexOf('.'))
  const keep = maxLen - ext.length - 3
  return `${base.slice(0, Math.floor(keep / 2))}…${base.slice(-Math.ceil(keep / 2))}${ext}`
}

export function UploadPrescriptionPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [file, setFile] = useState<File | null>(null)
  const [state, setState] = useState<UploadState>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  function clearFile(e: React.MouseEvent) {
    e.stopPropagation()
    setFile(null)
    setErrorMsg(null)
    setState('idle')
  }

  async function handleContinue() {
    if (!file || !user) return
    setState('uploading')
    setErrorMsg(null)

    try {
      const ext = file.name.split('.').pop() ?? 'bin'
      const path = `${user.id}/${Date.now()}.${ext}`

      const { error: storageError } = await supabase.storage
        .from('prescriptions')
        .upload(path, file)
      if (storageError) throw storageError

      const sourceType = file.type === 'application/pdf' ? 'rsp_pdf' : 'photo'

      const { data: prescription, error: dbError } = await supabase
        .from('prescriptions')
        .insert({ user_id: user.id, source_type: sourceType, file_path: path, status: 'uploaded' })
        .select().single()
      if (dbError) throw dbError

      setState('processing')

      if (isOcrSupported(file)) {
        const { error: proxyError } = await runOcr(file, prescription.id)
        if (proxyError === 'not_a_prescription') {
          setState('invalid')
          return
        }
        if (proxyError) throw new Error(proxyError)
      } else {
        const { error: fnError } = await supabase.functions.invoke('extract-prescription', {
          body: { prescription_id: prescription.id },
        })
        if (fnError) throw fnError
      }

      navigate(`/prescriptions/${prescription.id}/confirm`)
    } catch (err) {
      console.error(err)
      setState('error')
      setErrorMsg(err instanceof Error ? err.message : pt.upload.errorUpload)
    }
  }

  const isLoading = state === 'uploading' || state === 'processing'
  const isInvalid = state === 'invalid'
  const isPdf = file?.type === 'application/pdf'

  return (
    <div className="px-5 pt-8 pb-6">
      <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[#192830] mb-1">
        {pt.upload.title}
      </h1>
      <p className="text-base text-[#73787b] mb-8">
        Import your medications in seconds.
      </p>

      {file ? (
        /* ── File selected ── */
        <div className="space-y-3 mb-6">
          <div className={`flex items-center gap-4 bg-white border rounded-2xl px-5 py-4 transition-colors ${
            isInvalid ? 'border-[#ba1a1a]' : 'border-[#e9e8e4]'
          }`}>
            <div className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${
              isInvalid ? 'bg-[#ffdad6]' : isPdf ? 'bg-[#d5e5ef]' : 'bg-[#cbebcd]'
            }`}>
              {isInvalid
                ? <AlertCircle size={24} className="text-[#ba1a1a]" />
                : <FileText size={24} className={isPdf ? 'text-[#192830]' : 'text-[#49654d]'} />
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-base font-semibold truncate ${isInvalid ? 'text-[#ba1a1a]' : 'text-[#1b1c1a]'}`}>
                {formatFileName(file.name)}
              </p>
              <p className="text-sm text-[#73787b] mt-0.5">
                {isPdf ? 'PDF' : 'Image'} · {(file.size / 1024).toFixed(0)} KB
              </p>
            </div>
            {!isLoading && (
              <button
                onClick={clearFile}
                className="shrink-0 w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#f4f3f0] transition"
              >
                <X size={18} className="text-[#73787b]" />
              </button>
            )}
          </div>

          {isInvalid && (
            <div className="bg-[#ffdad6] rounded-2xl px-5 py-4">
              <p className="text-sm font-semibold text-[#ba1a1a]">{pt.upload.errorNotPrescriptionTitle}</p>
              <p className="text-sm text-[#ba1a1a]/80 mt-0.5">{pt.upload.errorNotPrescription}</p>
            </div>
          )}

          {isLoading && (
            <div className="bg-[#f4f4f0] rounded-2xl px-5 py-4 space-y-3">
              <ProgressStep done={state === 'processing'} active={state === 'uploading'} label="Uploading file" />
              <ProgressStep done={false} active={state === 'processing'} label="Reading prescription" />
            </div>
          )}
        </div>
      ) : (
        /* ── No file yet ── */
        <div className="space-y-3 mb-6">
          {/* Take photo — primary CTA */}
          <label className="flex items-center gap-4 w-full bg-[#192830] text-white rounded-2xl px-5 py-5 cursor-pointer hover:opacity-90 active:scale-[0.98] transition">
            <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <Camera size={22} className="text-white" />
            </div>
            <div className="text-left">
              <p className="text-base font-semibold">{pt.upload.takePhoto}</p>
              <p className="text-sm text-white/60 mt-0.5">Use your camera to scan a paper prescription</p>
            </div>
            <input type="file" accept="image/*" capture="environment" className="hidden"
              onChange={e => e.target.files?.[0] && setFile(e.target.files[0])} />
          </label>

          {/* Upload PDF */}
          <label className="flex items-center gap-4 w-full bg-white border border-[#e9e8e4] rounded-2xl px-5 py-5 cursor-pointer hover:bg-[#f4f4f0] active:bg-[#e9e8e4] transition">
            <div className="w-11 h-11 rounded-xl bg-[#d5e5ef] flex items-center justify-center shrink-0">
              <FileText size={22} className="text-[#192830]" />
            </div>
            <div className="text-left">
              <p className="text-base font-semibold text-[#1b1c1a]">{pt.upload.uploadPdf}</p>
              <p className="text-sm text-[#73787b] mt-0.5">Digital PDF — no AI vision needed</p>
            </div>
            <input type="file" accept="application/pdf" className="hidden"
              onChange={e => e.target.files?.[0] && setFile(e.target.files[0])} />
          </label>

          {/* Upload image from gallery */}
          <label className="flex items-center gap-4 w-full bg-white border border-[#e9e8e4] rounded-2xl px-5 py-5 cursor-pointer hover:bg-[#f4f4f0] active:bg-[#e9e8e4] transition">
            <div className="w-11 h-11 rounded-xl bg-[#cbebcd] flex items-center justify-center shrink-0">
              <Upload size={22} className="text-[#49654d]" />
            </div>
            <div className="text-left">
              <p className="text-base font-semibold text-[#1b1c1a]">Upload from gallery</p>
              <p className="text-sm text-[#73787b] mt-0.5">JPG, PNG or HEIC · max 15 MB</p>
            </div>
            <input type="file" accept="image/*" className="hidden"
              onChange={e => e.target.files?.[0] && setFile(e.target.files[0])} />
          </label>
        </div>
      )}

      {errorMsg && (
        <p className="text-[#ba1a1a] text-base mb-4">{errorMsg}</p>
      )}

      <button
        onClick={isInvalid ? clearFile : handleContinue}
        disabled={!file || isLoading}
        className="w-full flex items-center justify-center gap-2 min-h-[48px] py-3 bg-[#49654d] text-white text-base font-semibold rounded-lg hover:opacity-[0.88] hover:-translate-y-px active:scale-[0.98] transition disabled:opacity-40 shadow-[0_4px_16px_rgba(73,101,77,0.16)]"
      >
        {isLoading ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            {state === 'uploading' ? 'Uploading…' : 'Processing…'}
          </>
        ) : isInvalid ? (
          'Try another file'
        ) : (
          <>
            {pt.upload.continue}
            <ArrowRight size={18} />
          </>
        )}
      </button>
    </div>
  )
}

function ProgressStep({ done, active, label }: { done: boolean; active: boolean; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition ${
        done ? 'bg-[#49654d]' : active ? 'bg-[#192830]' : 'bg-[#c3c7ca]'
      }`}>
        {done ? (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : active ? (
          <Loader2 size={12} className="text-white animate-spin" />
        ) : null}
      </div>
      <span className={`text-sm font-medium ${active ? 'text-[#1b1c1a]' : done ? 'text-[#49654d]' : 'text-[#73787b]'}`}>
        {label}
      </span>
    </div>
  )
}
