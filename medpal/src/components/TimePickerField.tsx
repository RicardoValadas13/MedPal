import { useState } from 'react'
import { X, Plus, Clock } from 'lucide-react'

function getTimeOfDay(time: string) {
  const h = parseInt(time.split(':')[0], 10)
  if (h >= 5 && h < 12) return { label: 'Morning',   textColor: 'text-[#d97706]', bgColor: 'bg-[#fef3c7]' }
  if (h >= 12 && h < 18) return { label: 'Afternoon', textColor: 'text-[#2563eb]', bgColor: 'bg-[#dbeafe]' }
  if (h >= 18 && h < 22) return { label: 'Evening',   textColor: 'text-[#7c3aed]', bgColor: 'bg-[#ede9fe]' }
  return                        { label: 'Night',      textColor: 'text-[#43474a]', bgColor: 'bg-[#efeeea]' }
}

interface TimePickerFieldProps {
  times: string[]
  onChange: (times: string[]) => void
}

export function TimePickerField({ times, onChange }: TimePickerFieldProps) {
  const [adding, setAdding] = useState(false)
  const [newTime, setNewTime] = useState('08:00')

  function remove(t: string) {
    onChange(times.filter(x => x !== t))
  }

  function add() {
    if (!newTime) { setAdding(false); return }
    if (!times.includes(newTime)) onChange([...times, newTime].sort())
    setAdding(false)
    setNewTime('08:00')
  }

  const sorted = [...times].sort()

  return (
    <div className="flex flex-col gap-2">
      {sorted.map(t => {
        const tod = getTimeOfDay(t)
        return (
          <div key={t} className="flex items-center gap-3 h-12 px-4 bg-white rounded-xl border border-[#e9e8e4] shadow-sm">
            <div className={`w-7 h-7 rounded-full ${tod.bgColor} flex items-center justify-center shrink-0`}>
              <Clock size={13} className={tod.textColor} />
            </div>
            <span className="text-base font-bold text-[#192830] flex-1 tabular-nums">{t}</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${tod.bgColor} ${tod.textColor}`}>
              {tod.label}
            </span>
            <button
              type="button"
              onClick={() => remove(t)}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#f4f3f0] transition text-[#73787b] shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        )
      })}

      {adding ? (
        <div className="flex items-center gap-2">
          <input
            type="time"
            value={newTime}
            onChange={e => setNewTime(e.target.value)}
            autoFocus
            className="flex-1 h-12 px-3 text-base font-semibold rounded-xl border border-[#49654d] bg-[#f0f7f1] text-[#192830] focus:outline-none shadow-[0_0_0_3px_rgba(73,101,77,0.10)]"
          />
          <button
            type="button"
            onClick={add}
            className="h-12 px-5 bg-[#192830] text-white text-sm font-semibold rounded-xl hover:opacity-90 active:scale-95 transition"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => setAdding(false)}
            className="h-12 w-12 flex items-center justify-center rounded-xl border border-[#e9e8e4] text-[#73787b] hover:text-[#43474a] transition"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 h-12 px-4 text-sm font-semibold text-[#49654d] rounded-xl border border-dashed border-[#49654d]/40 hover:bg-[#f0f7f1] transition w-full justify-center"
        >
          <Plus size={15} />
          Add time
        </button>
      )}
    </div>
  )
}
