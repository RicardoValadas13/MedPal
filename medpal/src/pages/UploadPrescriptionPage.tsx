import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useNavigate } from 'react-router-dom'
import { Upload, Camera, FileText, ArrowRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { pt } from '../i18n/pt'

type UploadState = 'idle' | 'uploading' | 'processing' | 'error'

export function UploadPrescriptionPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [file, setFile] = useState<File | null>(null)
  const [state, setState] = useState<UploadState>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) {
      setFile(accepted[0])
      setErrorMsg(null)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'], 'image/*': ['.jpg', '.jpeg', '.png', '.heic'] },
    maxFiles: 1,
  })

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
        .insert({
          user_id: user.id,
          source_type: sourceType,
          file_path: path,
          status: 'uploaded',
        })
        .select()
        .single()

      if (dbError) throw dbError

      setState('processing')

      const { error: fnError } = await supabase.functions.invoke('extract-prescription', {
        body: { prescription_id: prescription.id },
      })

      if (fnError) throw fnError

      navigate(`/prescriptions/${prescription.id}/confirm`)
    } catch (err) {
      console.error(err)
      setState('error')
      setErrorMsg(err instanceof Error ? err.message : pt.upload.errorUpload)
    }
  }

  const isLoading = state === 'uploading' || state === 'processing'

  return (
    <div className="px-5 pt-8 pb-6">
      <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[#192830] mb-8">{pt.upload.title}</h1>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`relative flex flex-col items-center justify-center gap-4 p-8 rounded-2xl border-2 border-dashed transition cursor-pointer ${
          isDragActive
            ? 'border-[#49654d] bg-[#cbebcd]/30'
            : file
            ? 'border-[#49654d] bg-[#cbebcd]/20'
            : 'border-[#c3c7ca] bg-white hover:bg-[#f4f4f0]'
        }`}
      >
        <input {...getInputProps()} />
        {file ? (
          <>
            <FileText size={40} className="text-[#49654d]" />
            <p className="text-lg font-semibold text-[#49654d] text-center break-all max-w-[240px]">
              {file.name}
            </p>
            <p className="text-sm font-medium text-[#49654d]">Tap to change</p>
          </>
        ) : (
          <>
            <Upload size={40} className="text-[#73787b]" />
            <p className="text-lg text-[#43474a] text-center">{pt.upload.dropzone}</p>
          </>
        )}
      </div>

      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px bg-[#c3c7ca]" />
        <span className="text-sm font-medium text-[#73787b]">{pt.upload.orDivider}</span>
        <div className="flex-1 h-px bg-[#c3c7ca]" />
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <label className="flex flex-col items-center justify-center gap-2 py-5 rounded-2xl border border-[#c3c7ca] bg-white cursor-pointer hover:bg-[#f4f4f0] active:bg-[#e9e8e4] transition min-h-[48px]">
          <Camera size={24} className="text-[#192830]" />
          <span className="text-base font-semibold text-[#1b1c1a]">{pt.upload.takePhoto}</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={e => e.target.files?.[0] && setFile(e.target.files[0])}
          />
        </label>

        <label className="flex flex-col items-center justify-center gap-2 py-5 rounded-2xl border border-[#c3c7ca] bg-white cursor-pointer hover:bg-[#f4f4f0] active:bg-[#e9e8e4] transition min-h-[48px]">
          <FileText size={24} className="text-[#192830]" />
          <span className="text-base font-semibold text-[#1b1c1a]">{pt.upload.uploadPdf}</span>
          <input
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={e => e.target.files?.[0] && setFile(e.target.files[0])}
          />
        </label>
      </div>

      {/* PDF info note */}
      <div className="flex gap-3 items-start bg-[#d5e5ef] rounded-xl px-4 py-3 mb-6">
        <FileText size={18} className="text-[#192830] mt-0.5 shrink-0" />
        <p className="text-base text-[#192830]">{pt.upload.pdfNote}</p>
      </div>

      {errorMsg && (
        <p className="text-[#ba1a1a] text-base mb-4">{errorMsg}</p>
      )}

      {state === 'processing' && (
        <div className="bg-[#cbebcd] rounded-xl px-4 py-3 mb-4">
          <p className="text-base font-medium text-[#49654d]">{pt.upload.processing}</p>
        </div>
      )}

      <button
        onClick={handleContinue}
        disabled={!file || isLoading}
        className="w-full flex items-center justify-center gap-2 min-h-[48px] py-3 bg-[#192830] text-white text-base font-semibold rounded-lg hover:opacity-[0.88] hover:-translate-y-px active:scale-[0.98] transition disabled:opacity-40 shadow-[0_4px_16px_rgba(25,40,48,0.12)]"
      >
        {isLoading ? (
          state === 'uploading' ? pt.upload.uploading : pt.upload.processing
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
