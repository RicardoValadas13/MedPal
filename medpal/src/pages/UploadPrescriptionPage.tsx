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
    <div className="px-4 pt-6 pb-6">
      <h1 className="text-xl font-semibold text-gray-900 mb-6">{pt.upload.title}</h1>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`relative flex flex-col items-center justify-center gap-3 p-8 rounded-2xl border-[0.5px] transition cursor-pointer ${
          isDragActive
            ? 'border-green-500 bg-green-50'
            : file
            ? 'border-green-300 bg-green-50'
            : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
        }`}
      >
        <input {...getInputProps()} />
        {file ? (
          <>
            <FileText size={36} className="text-green-600" />
            <p className="text-sm font-medium text-green-800 text-center break-all max-w-[240px]">
              {file.name}
            </p>
            <p className="text-xs text-green-600">Tap to change</p>
          </>
        ) : (
          <>
            <Upload size={36} className="text-gray-400" />
            <p className="text-sm text-gray-500 text-center">{pt.upload.dropzone}</p>
          </>
        )}
      </div>

      <div className="flex items-center gap-3 my-4">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400">{pt.upload.orDivider}</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <label className="flex flex-col items-center justify-center gap-2 py-4 rounded-2xl border-[0.5px] border-gray-200 bg-white cursor-pointer active:bg-gray-50 min-h-[44px]">
          <Camera size={24} className="text-gray-600" />
          <span className="text-xs font-medium text-gray-700">{pt.upload.takePhoto}</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={e => e.target.files?.[0] && setFile(e.target.files[0])}
          />
        </label>

        <label className="flex flex-col items-center justify-center gap-2 py-4 rounded-2xl border-[0.5px] border-gray-200 bg-white cursor-pointer active:bg-gray-50 min-h-[44px]">
          <FileText size={24} className="text-gray-600" />
          <span className="text-xs font-medium text-gray-700">{pt.upload.uploadPdf}</span>
          <input
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={e => e.target.files?.[0] && setFile(e.target.files[0])}
          />
        </label>
      </div>

      {/* PDF info note */}
      <div className="flex gap-2 items-start bg-blue-50 rounded-xl px-3 py-2.5 mb-6">
        <FileText size={14} className="text-blue-500 mt-0.5 shrink-0" />
        <p className="text-xs text-blue-700">{pt.upload.pdfNote}</p>
      </div>

      {errorMsg && (
        <p className="text-red-600 text-xs mb-4">{errorMsg}</p>
      )}

      {/* Status indicator */}
      {state === 'processing' && (
        <div className="bg-green-50 rounded-xl px-3 py-2.5 mb-4">
          <p className="text-xs text-green-700 font-medium">{pt.upload.processing}</p>
        </div>
      )}

      <button
        onClick={handleContinue}
        disabled={!file || isLoading}
        className="w-full flex items-center justify-center gap-2 py-4 bg-green-600 text-white text-sm font-semibold rounded-2xl hover:bg-green-700 active:scale-[0.98] transition disabled:opacity-40 min-h-[44px]"
      >
        {isLoading ? (
          state === 'uploading' ? pt.upload.uploading : pt.upload.processing
        ) : (
          <>
            {pt.upload.continue}
            <ArrowRight size={16} />
          </>
        )}
      </button>
    </div>
  )
}
