import { useNavigate } from 'react-router-dom'
import { Camera, LayoutGrid } from 'lucide-react'

export function YourBoxPage() {
  const navigate = useNavigate()

  return (
    <div className="px-5 pt-8 pb-6">
      <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[#192830] mb-1">
        Your Box
      </h1>
      <p className="text-base text-[#73787b] mb-8">
        Manage and verify your medication box.
      </p>

      <div className="space-y-3">
        <button
          onClick={() => navigate('/medications')}
          className="flex items-center gap-4 w-full bg-[#192830] text-white rounded-2xl px-5 py-5 hover:opacity-90 active:scale-[0.98] transition"
        >
          <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
            <LayoutGrid size={22} className="text-white" />
          </div>
          <div className="text-left">
            <p className="text-base font-semibold">Organise the box</p>
            <p className="text-sm text-white/60 mt-0.5">Review and arrange your medication schedule</p>
          </div>
        </button>

        <button
          onClick={() => navigate('/prescriptions/upload')}
          className="flex items-center gap-4 w-full bg-white border border-[#e9e8e4] rounded-2xl px-5 py-5 hover:bg-[#f4f4f0] active:bg-[#e9e8e4] transition"
        >
          <div className="w-11 h-11 rounded-xl bg-[#cbebcd] flex items-center justify-center shrink-0">
            <Camera size={22} className="text-[#49654d]" />
          </div>
          <div className="text-left">
            <p className="text-base font-semibold text-[#1b1c1a]">Check your box</p>
            <p className="text-sm text-[#73787b] mt-0.5">Scan a prescription to add new medications</p>
          </div>
        </button>
      </div>
    </div>
  )
}
