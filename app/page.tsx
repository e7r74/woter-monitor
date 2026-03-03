'use client'

import React, { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// --- Типизация данных Wialon ---
interface WialonSensor {
  id: number
  n: string // Имя датчика (например, "Уровень")
  t: string // Тип датчика
  p: string // Параметр (например, "adc3")
}

interface WialonUnit {
  nm: string
  sens: Record<string, WialonSensor>
  pvs?: Record<string, { v: number; t: number }> // Последние вычисленные значения
  lmsg?: {
    p?: Record<string, number>
  }
  pos?: {
    x: number
    y: number
  }
}

// Динамический импорт карты для предотвращения ошибок SSR
const Map = dynamic(() => import('./components/Map'), {
  ssr: false,
  loading: () => <div className="h-[400px] bg-slate-800 animate-pulse rounded-3xl" />,
})

export default function Dashboard() {
  const router = useRouter()

  const [mounted, setMounted] = useState(false)
  const [isAuth, setIsAuth] = useState(false)

  const [sensorData, setSensorData] = useState({
    name: 'Загрузка...',
    level: 0,
    lat: 43.2425,
    lng: 76.9592,
    lastUpdate: '',
  })

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn')
    setIsAuth(false)
    router.push('/login')
  }

  const updateData = useCallback(async () => {
    try {
      const loginRes = await fetch('/api/wialon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ svc: 'token/login', params: {} }),
      })

      const loginData = await loginRes.json()
      const eid = loginData.eid
      if (!eid) return

      const dataRes = await fetch('/api/wialon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          svc: 'core/search_items',
          params: {
            spec: { itemsType: 'avl_unit', propName: 'sys_name', propValueMask: '*', sortType: 'sys_name' },
            force: 1,
            // ПРОВЕРЬ ТУТ: должно быть строго 5121
            flags: 5121,
            from: 0,
            to: 0,
          },
          sid: eid,
        }),
      })

      const result = await dataRes.json()

      if (result.items && result.items[0]) {
        const unit = result.items[0]
        let waterLevel = 0

        if (unit.sens && unit.sens['1']) {
          const sensor = unit.sens['1']
          const rawValue = unit.lmsg?.p?.[sensor.p] || 0

          // Пытаемся взять готовое значение из pvs
          if (unit.pvs && unit.pvs['1']) {
            waterLevel = unit.pvs['1'].v
          }
          // Если pvs пуст (как в твоем случае), считаем вручную по таблице из консоли
          else if (sensor.tbl && sensor.tbl.length > 0) {
            // Для значения 130 подходит первая строка таблицы (индекс 0)
            const row = sensor.tbl[0]
            waterLevel = row.a * rawValue + row.b
          } else {
            waterLevel = rawValue
          }
        }

        setSensorData({
          name: unit.nm,
          level: parseFloat(Number(waterLevel).toFixed(2)), // Округлит до 4.49
          lat: unit.pos?.y || 43.2425,
          lng: unit.pos?.x || 76.9592,
          lastUpdate: new Date().toLocaleTimeString(),
        })
      }
    } catch (error) {
      console.error('Ошибка в updateData:', error)
    }
  }, [])

  useEffect(() => {
    const loggedIn = localStorage.getItem('isLoggedIn') === 'true'

    const initialize = async () => {
      setMounted(true)
      setIsAuth(loggedIn)
    }

    initialize()

    if (!loggedIn) {
      router.push('/login')
      return
    }

    let isMounted = true
    const tick = async () => {
      if (isMounted) await updateData()
    }

    tick()
    const interval = setInterval(tick, 30000)

    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [router, updateData])

  if (!mounted || !isAuth) {
    return <div className="min-h-screen bg-slate-900" />
  }

  return (
    <main className="min-h-screen bg-slate-900 text-white p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold text-slate-400 uppercase tracking-widest">
            <span className="text-slate-200 ml-4">Ulzhan Quanyshbekkyzy</span>
          </h1>
          <button
            onClick={handleLogout}
            className="bg-slate-800 hover:bg-red-900/40 text-slate-300 px-4 py-2 rounded-xl border border-slate-700 transition-all text-sm">
            Выйти
          </button>
        </div>

        <div className="bg-slate-800 rounded-4xl p-8 border border-slate-700 shadow-2xl flex flex-col md:flex-row justify-between items-center">
          <div className="text-center md:text-left">
            <span className="text-sm text-slate-500 uppercase tracking-tighter">Текущий уровень</span>
            <div className="flex items-baseline gap-2">
              <span className="text-7xl font-black text-blue-500">{sensorData.level}</span>
              <span className="text-2xl text-slate-500 font-light">см</span>
            </div>
          </div>
          <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-700 text-center">
            <p className="text-[10px] text-slate-500 uppercase mb-2">Время обновления</p>
            <p className="text-xl font-mono text-blue-300">{sensorData.lastUpdate || '--:--:--'}</p>
          </div>
        </div>

        <div className="overflow-hidden rounded-4xl border border-slate-700 shadow-2xl">
          <Map pos={[sensorData.lat, sensorData.lng]} name={sensorData.name} />
        </div>
        <Link
          href="/water-report"
          className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl transition-all font-medium shadow-lg shadow-blue-900/20 active:scale-95">
          Перейти к отчету
        </Link>
      </div>
    </main>
  )
}
