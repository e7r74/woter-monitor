'use client'

import React, { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'
import * as XLSX from 'xlsx' // Импорт библиотеки для Excel

interface ChartPoint {
  time: string
  level: number
  rawDate: string // Добавим для более точной даты в Excel
}

interface WialonMessage {
  t: number
  p?: {
    rs485fuel_level1?: number
    [key: string]: number | string | undefined
  }
}

const Map = dynamic(() => import('../components/Map'), {
  ssr: false,
  loading: () => <div className="h-75 bg-slate-800 animate-pulse rounded-4xl" />,
})

export default function WaterReportPage() {
  const [hasRendered, setHasRendered] = useState(false)
  const [chartData, setChartData] = useState<ChartPoint[]>([])
  const [lastUpdate, setLastUpdate] = useState('')

  const fetchHistoryData = useCallback(async () => {
    try {
      const loginRes = await fetch('/api/wialon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ svc: 'token/login', params: {} }),
      })
      const { eid } = await loginRes.json()
      if (!eid) return

      const to = Math.floor(Date.now() / 1000)
      const msgRes = await fetch('/api/wialon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          svc: 'messages/load_last',
          params: { itemId: 29672520, lastTime: to, lastCount: 100, flags: 0, flagsMask: 0, loadCount: 100 },
          sid: eid,
        }),
      })

      const data = await msgRes.json()
      const messages: WialonMessage[] = data.messages || []

      if (messages.length > 0) {
        const a = 0.034843205575
        const b = -0.034843205575

        const formattedData: ChartPoint[] = messages
          .map((m) => {
            const dateObj = new Date(m.t * 1000)
            return {
              time: dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              level: parseFloat((a * (m.p?.rs485fuel_level1 || 0) + b).toFixed(2)),
              rawDate: dateObj.toLocaleString(), // Полная дата для Excel
            }
          })
          .reverse()

        setChartData(formattedData)
        setLastUpdate(new Date().toLocaleTimeString())
      }
    } catch (e) {
      console.error('Data error:', e)
    }
  }, [])

  // Функция для экспорта в Excel
  const exportToExcel = () => {
    if (chartData.length === 0) return

    // Подготовка данных: переименовываем колонки для таблицы
    const excelRows = chartData.map((item) => ({
      'Дата и время': item.rawDate,
      'Уровень воды (см)': item.level,
    }))

    const worksheet = XLSX.utils.json_to_sheet(excelRows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Отчет по уровню')

    // Генерация файла и скачивание
    XLSX.writeFile(workbook, `Water_Level_Report_${new Date().toLocaleDateString()}.xlsx`)
  }

  useEffect(() => {
    const handle = requestAnimationFrame(() => setHasRendered(true))
    const timer = setTimeout(() => {
      void fetchHistoryData()
    }, 100)
    const interval = setInterval(() => {
      void fetchHistoryData()
    }, 60000)
    return () => {
      cancelAnimationFrame(handle)
      clearTimeout(timer)
      clearInterval(interval)
    }
  }, [fetchHistoryData])

  if (!hasRendered) return <div className="min-h-screen bg-[#0f172a]" />

  return (
    <div className="min-h-screen bg-[#0f172a] text-white p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Заголовок с кнопкой Excel */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white uppercase">Мониторинг ручья</h1>
            <p className="text-slate-500 text-sm">Последние данные: {lastUpdate}</p>
          </div>

          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-2xl transition-all font-medium shadow-lg shadow-emerald-900/20 active:scale-95">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Скачать Excel
          </button>
        </div>

        {/* График */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-4xl p-6 h-80 shadow-inner">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorLevel" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="time" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} unit=" см" />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px' }}
                itemStyle={{ color: '#3b82f6' }}
              />
              <Area type="monotone" dataKey="level" stroke="#3b82f6" strokeWidth={3} fill="url(#colorLevel)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Карта */}
        <div className="rounded-4xl overflow-hidden border border-slate-800 h-100">
          <Map pos={[43.240126, 76.95383]} name="ручей тест" />
        </div>
      </div>
    </div>
  )
}
