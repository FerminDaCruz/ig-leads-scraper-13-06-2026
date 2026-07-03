'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FiChevronDown } from 'react-icons/fi'

export interface Semana {
  key: string // lunes de la semana (YYYY-MM-DD), id para la URL
  label: string // "30 jun – 6 jul"
  started: boolean
}

interface Props {
  mes: string // 'YYYY-MM'
  vista: 'dia' | 'semana'
  maxDay: number // último día seleccionable (hoy si es el mes en curso, si no el último del mes)
  daysInMonth: number
  selectedDay: number
  todayDay: number | null // día de hoy si el mes es el actual
  selectedWeekKey: string
  weeks: Semana[]
  diaTexto: string
  semanaTexto: string
}

const DOW = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const pad = (n: number) => String(n).padStart(2, '0')

export function PeriodoPicker({
  mes, vista, maxDay, daysInMonth, selectedDay, todayDay, selectedWeekKey, weeks, diaTexto, semanaTexto,
}: Props) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const irDia = (day: number) => {
    setOpen(false)
    router.push(`/metricas?mes=${mes}&vista=dia&dia=${mes}-${pad(day)}`)
  }
  const irSemana = (key: string) => {
    setOpen(false)
    router.push(`/metricas?mes=${mes}&vista=semana&sem=${key}`)
  }

  // Grilla del mes (lunes primero).
  const [y, m] = mes.split('-').map(Number)
  const offset = (new Date(y, m - 1, 1).getDay() + 6) % 7
  const celdas: (number | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  return (
    <div className="relative flex items-center gap-2">
      <span className="text-border select-none">|</span>
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium text-foreground border border-border hover:bg-foreground/5 transition-colors capitalize"
      >
        {vista === 'dia' ? diaTexto : semanaTexto}
        <FiChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 top-full left-8 mt-2 w-max rounded-2xl border border-border bg-card shadow-xl p-3">
            {vista === 'dia' ? (
              <div className="w-64">
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {DOW.map((d, i) => (
                    <span key={i} className="text-center text-[0.65rem] font-semibold text-muted py-1">{d}</span>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {celdas.map((day, i) => {
                    if (day === null) return <span key={`b${i}`} />
                    const disabled = day > maxDay
                    const sel = day === selectedDay
                    const hoy = day === todayDay
                    return (
                      <button
                        key={day}
                        disabled={disabled}
                        onClick={() => irDia(day)}
                        className={`h-8 w-8 grid place-items-center rounded-lg text-sm tnum transition-colors ${
                          sel
                            ? 'bg-foreground text-background font-bold'
                            : disabled
                            ? 'text-muted/30 cursor-not-allowed'
                            : 'text-foreground hover:bg-foreground/10'
                        } ${hoy && !sel ? 'ring-1 ring-inset ring-foreground/40 font-semibold' : ''}`}
                      >
                        {day}
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-1 min-w-[13rem]">
                {weeks.map((w, i) => {
                  const disabled = !w.started
                  const sel = w.key === selectedWeekKey
                  return (
                    <button
                      key={w.key}
                      disabled={disabled}
                      onClick={() => irSemana(w.key)}
                      className={`text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        sel
                          ? 'bg-foreground text-background font-semibold'
                          : disabled
                          ? 'text-muted/40 cursor-not-allowed'
                          : 'text-foreground hover:bg-foreground/10'
                      }`}
                    >
                      Semana {i + 1} <span className={sel ? 'opacity-80' : 'text-muted'}>· {w.label}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
