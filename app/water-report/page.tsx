'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Legend } from 'recharts'
import * as XLSX from 'xlsx'

interface ChartPoint {
  time: string
  fullDisplay: string
  level: number
  discharge: number
  rawDate: string
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

  // Состояние для координат (теперь берем из API)
  const [mapPos, setMapPos] = useState<[number, number]>([43.2425, 76.9592])
  const [unitName, setUnitName] = useState('Загрузка...')

  const [fromDate, setFromDate] = useState(new Date(new Date().setHours(0, 0, 0, 0)).toISOString().slice(0, 16))
  const [toDate, setToDate] = useState(new Date().toISOString().slice(0, 16))
  const [isLoading, setIsLoading] = useState(false)

  const [coeffA, setCoeffA] = useState(0.857410584)
  const [coeffB, setCoeffB] = useState(2.096947)

  const fetchHistoryData = useCallback(
    async (isAutoUpdate = false) => {
      try {
        if (!isAutoUpdate) setIsLoading(true)

        const loginRes = await fetch('/api/wialon', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ svc: 'token/login', params: {} }),
        })
        const { eid } = await loginRes.json()
        if (!eid) return

        // 1. Сначала получим текущую позицию и имя объекта (как на главной)
        const unitRes = await fetch('/api/wialon', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            svc: 'core/search_items',
            params: {
              spec: { itemsType: 'avl_unit', propName: 'sys_name', propValueMask: '*', sortType: 'sys_name' },
              force: 1,
              flags: 1025, // Флаг для позиции и базовых данных
              from: 0,
              to: 0,
            },
            sid: eid,
          }),
        })
        const unitData = await unitRes.json()
        if (unitData.items && unitData.items[0]) {
          const unit = unitData.items[0]
          setMapPos([unit.pos?.y || 43.2425, unit.pos?.x || 76.9592])
          setUnitName(unit.nm)
        }

        // 2. Затем грузим историю для графика
        const fromTimestamp = Math.floor(new Date(fromDate).getTime() / 1000)
        const toTimestamp = Math.floor(new Date(toDate).getTime() / 1000)

        const msgRes = await fetch('/api/wialon', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            svc: 'messages/load_interval',
            params: {
              itemId: 29672520,
              timeFrom: fromTimestamp,
              timeTo: toTimestamp,
              flags: 0,
              flagsMask: 0,
              loadCount: 1000,
            },
            sid: eid,
          }),
        })

        const data = await msgRes.json()
        const messages: WialonMessage[] = data.messages || []

        const a_sensor = 0.034843205575
        const b_sensor = -0.034843205575

        const formattedData: ChartPoint[] = messages.map((m) => {
          const dateObj = new Date(m.t * 1000)
          const rawCalc = a_sensor * (m.p?.rs485fuel_level1 || 0) + b_sensor
          const levelInCm = rawCalc / 100
          const H = levelInCm / 100
          const validH = H > 0 ? H : 0
          const Q = coeffA * validH + coeffB * Math.pow(validH, 2)

          return {
            time: dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            fullDisplay: dateObj.toLocaleString([], {
              day: '2-digit',
              month: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            }),
            level: parseFloat(levelInCm.toFixed(2)),
            discharge: parseFloat(Q.toFixed(4)),
            rawDate: dateObj.toLocaleString(),
          }
        })

        setChartData(formattedData)
        setLastUpdate(new Date().toLocaleTimeString())
      } catch (e) {
        console.error('Data error:', e)
      } finally {
        setIsLoading(false)
      }
    },
    [fromDate, toDate, coeffA, coeffB],
  )

  const dailyStats = useMemo(() => {
    const groups: Record<string, { totalLevel: number; totalQ: number; count: number }> = {}
    chartData.forEach((point) => {
      const day = point.rawDate.split(',')[0]
      if (!groups[day]) groups[day] = { totalLevel: 0, totalQ: 0, count: 0 }
      groups[day].totalLevel += point.level
      groups[day].totalQ += point.discharge
      groups[day].count += 1
    })
    return Object.entries(groups).map(([date, data]) => ({
      date,
      avgLevel: (data.totalLevel / data.count).toFixed(2),
      avgQ: (data.totalQ / data.count).toFixed(4),
    }))
  }, [chartData])

  const exportToExcel = () => {
    if (chartData.length === 0) return
    const workbook = XLSX.utils.book_new()
    const summaryRows = [
      ['Дата', 'Ср. уровень (см)', 'Ср. расход (м3/с)'],
      ...dailyStats.map((s) => [s.date, s.avgLevel, s.avgQ]),
    ]
    const detailRows = [
      ['Дата и время', 'Уровень (см)', 'Расход (м3/с)'],
      ...chartData.map((c) => [c.rawDate, c.level, c.discharge]),
    ]
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([['СРЕДНИЕ ПОКАЗАТЕЛИ'], ...summaryRows]), 'Среднее')
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([['ДЕТАЛЬНЫЙ ОТЧЕТ'], ...detailRows]), 'Детали')
    XLSX.writeFile(workbook, `Water_Report_${new Date().toLocaleDateString()}.xlsx`)
  }

  useEffect(() => {
    setHasRendered(true)
    fetchHistoryData()
    const interval = setInterval(() => fetchHistoryData(true), 60000)
    return () => clearInterval(interval)
  }, [fetchHistoryData])

  if (!hasRendered) return <div className="min-h-screen bg-[#0f172a]" />

  return (
    <div className="min-h-screen bg-[#0f172a] text-white p-4 md:p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Панель управления */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div>
              <label className="text-blue-400 text-[10px] mb-2 uppercase font-bold block">Коэф. a</label>
              <input
                type="number"
                step="0.000000001"
                value={coeffA}
                onChange={(e) => setCoeffA(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none"
              />
            </div>
            <div>
              <label className="text-blue-400 text-[10px] mb-2 uppercase font-bold block">Коэф. b</label>
              <input
                type="number"
                step="0.000000001"
                value={coeffB}
                onChange={(e) => setCoeffB(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none"
              />
            </div>
            <div>
              <label className="text-slate-400 text-[10px] mb-2 uppercase font-bold block">Начало</label>
              <input
                type="datetime-local"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white text-xs"
              />
            </div>
            <div>
              <label className="text-slate-400 text-[10px] mb-2 uppercase font-bold block">Конец</label>
              <input
                type="datetime-local"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white text-xs"
              />
            </div>
            <button
              onClick={() => fetchHistoryData()}
              className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl font-bold transition-all">
              {isLoading ? '...' : 'Показать'}
            </button>
          </div>
        </div>

        {/* Шапка */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-tight">{unitName}</h1>
            <p className="text-slate-500 text-sm italic">Обновлено: {lastUpdate}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={exportToExcel}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-medium">
              Excel
            </button>
            <button
              onClick={() => window.print()}
              className="bg-red-600 hover:bg-red-500 text-white px-5 py-2.5 rounded-xl font-medium">
              PDF
            </button>
          </div>
        </div>

        {/* График и Таблица */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-4xl p-6 h-96 shadow-inner">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="fullDisplay" stroke="#64748b" fontSize={10} minTickGap={45} />
              <YAxis yAxisId="left" stroke="#3b82f6" fontSize={12} unit=" см" />
              <YAxis yAxisId="right" orientation="right" stroke="#10b981" fontSize={12} unit=" м³/с" />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px' }}
              />
              <Area
                yAxisId="left"
                type="monotone"
                name="level"
                dataKey="level"
                stroke="#3b82f6"
                fillOpacity={0.1}
                fill="#3b82f6"
                strokeWidth={3}
              />
              <Area
                yAxisId="right"
                type="monotone"
                name="discharge"
                dataKey="discharge"
                stroke="#10b981"
                fillOpacity={0.1}
                fill="#10b981"
                strokeWidth={3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Таблица */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          <table className="w-full text-left text-sm">
            <thead className="text-slate-500 uppercase text-[10px] font-bold border-b border-slate-800 bg-slate-900/40">
              <tr>
                <th className="px-6 py-4">Дата</th>
                <th className="px-6 py-4 text-blue-400">Ср. уровень (см)</th>
                <th className="px-6 py-4 text-emerald-400">Ср. расход (м³/с)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {dailyStats.map((s, i) => (
                <tr key={i} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-6 py-4">{s.date}</td>
                  <td className="px-6 py-4 font-bold">{s.avgLevel}</td>
                  <td className="px-6 py-4 font-mono">{s.avgQ}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* КАРТА С API КООРДИНАТАМИ */}
        <div className="rounded-4xl overflow-hidden border border-slate-800 h-80 shadow-2xl transition-all">
          <Map pos={mapPos} name={unitName} />
        </div>
      </div>
    </div>
  )
}
