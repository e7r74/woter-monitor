'use client'

import React, { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'

const Map = dynamic(() => import('./components/Map'), {
  ssr: false,
  loading: () => <div className="h-[400px] bg-slate-800 animate-pulse rounded-3xl" />,
})

// ТОКЕН ЗДЕСЬ БОЛЬШЕ НЕ НУЖЕН - МЫ ЕГО УДАЛИЛИ

export default function Dashboard() {
  const router = useRouter()

  const [isAuth, setIsAuth] = useState<boolean | null>(null)
  const [sensorData, setSensorData] = useState({
    name: 'Загрузка...',
    level: 0,
    lat: 43.2425,
    lng: 76.9592,
    lastUpdate: '',
  })

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn')
    router.push('/login')
  }

  const updateData = useCallback(async () => {
    try {
      // 1. ЛОГИН: Теперь отправляем ПУСТЫЕ параметры.
      // Сервер сам подставит токен из .env.local, когда увидит svc: 'token/login'
      const loginRes = await fetch('/api/wialon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          svc: 'token/login',
          params: {}, // Пустой объект, так как токен спрятан на сервере
        }),
      })

      const contentType = loginRes.headers.get('content-type')
      if (!loginRes.ok || !contentType?.includes('application/json')) {
        console.error('Ошибка API: Проверьте работу прокси и наличие WIALON_TOKEN в .env.local')
        return
      }

      const loginData = await loginRes.json()
      const eid = loginData.eid

      if (!eid) return

      // 2. ПОЛУЧЕНИЕ ДАННЫХ: Здесь всё остается так же
      const dataRes = await fetch('/api/wialon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          svc: 'core/search_items',
          params: {
            spec: { itemsType: 'avl_unit', propName: 'sys_name', propValueMask: '*', sortType: 'sys_name' },
            force: 1,
            flags: 1153,
            from: 0,
            to: 0,
          },
          sid: eid,
        }),
      })

      const result = await dataRes.json()

      if (result.items && result.items[0]) {
        const unit = result.items[0]
        const adcValue = unit.lmsg?.p?.adc3 || 0

        setSensorData({
          name: unit.nm,
          level: parseFloat((adcValue * 42.625).toFixed(2)),
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
    const loggedIn = localStorage.getItem('isLoggedIn')

    if (!loggedIn) {
      router.push('/login')
    } else {
      Promise.resolve().then(() => setIsAuth(true))
    }

    let isMounted = true
    const tick = async () => {
      if (isMounted && loggedIn) await updateData()
    }

    tick()
    const interval = setInterval(tick, 30000)

    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [router, updateData])

  if (isAuth !== true) {
    return <div className="min-h-screen bg-slate-900" />
  }

  return (
    <main className="min-h-screen bg-slate-900 text-white p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold text-slate-400 uppercase tracking-widest">
            {sensorData.name} <span className="text-slate-200 ml-4">Ulzhan Quanyshbekkyzy</span>
          </h1>
          <button
            onClick={handleLogout}
            className="bg-slate-800 hover:bg-red-900/40 text-slate-300 px-4 py-2 rounded-xl border border-slate-700 transition-all text-sm">
            Выйти
          </button>
        </div>

        <div className="bg-slate-800 rounded-[2rem] p-8 border border-slate-700 shadow-2xl flex flex-col md:flex-row justify-between items-center">
          <div className="text-center md:text-left">
            <span className="text-sm text-slate-500 uppercase tracking-tighter">Текущий уровень</span>
            <div className="flex items-baseline gap-2">
              <span className="text-7xl font-black text-blue-500">{sensorData.level}</span>
              <span className="text-2xl text-slate-500 font-light">см</span>
            </div>
          </div>
          <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-700 text-center">
            <p className="text-[10px] text-slate-500 uppercase mb-2">Обновлено</p>
            <p className="text-xl font-mono text-blue-300">{sensorData.lastUpdate || '--:--:--'}</p>
          </div>
        </div>

        <div className="overflow-hidden rounded-[2rem] border border-slate-700 shadow-2xl">
          <Map pos={[sensorData.lat, sensorData.lng]} name={sensorData.name} />
        </div>
      </div>
    </main>
  )
}
