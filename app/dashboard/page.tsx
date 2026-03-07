// 'use client'

// import React, { useState, useEffect, useSyncExternalStore } from 'react'
// import {
//   PieChart,
//   Pie,
//   Cell,
//   ResponsiveContainer,
//   AreaChart,
//   Area,
//   XAxis,
//   YAxis,
//   CartesianGrid,
//   Tooltip,
//   LineChart,
//   Line,
// } from 'recharts'
// import {
//   Activity,
//   Signal,
//   Navigation,
//   Droplets,
//   LayoutDashboard,
//   Calendar,
//   MapPin,
//   Bell,
//   Trophy,
//   fuel,
//   Gauge,
//   Loader2,
//   Info,
// } from 'lucide-react'

// // --- ТИПЫ ---
// interface DetailItem {
//   label: string
//   value: number
//   color?: string
// }

// const subscribe = () => () => {}

// export default function WialonFullDashboard() {
//   const [loading, setLoading] = useState(true)
//   const isClient = useSyncExternalStore(
//     subscribe,
//     () => true,
//     () => false,
//   )

//   useEffect(() => {
//     const timer = setTimeout(() => setLoading(false), 500)
//     return () => clearTimeout(timer)
//   }, [])

//   if (!isClient || loading)
//     return (
//       <div className="min-h-screen flex items-center justify-center bg-[#f4f7f9]">
//         <Loader2 className="animate-spin text-blue-600" />
//       </div>
//     )

//   // Данные для графиков (имитация "ручей тест")
//   const chartData = [
//     { t: '2026-02-27', v: 0 },
//     { t: '2026-02-28', v: 0 },
//     { t: '2026-03-01', v: 0 },
//     { t: '2026-03-02', v: 0 },
//     { t: '2026-03-03', v: 0 },
//     { t: '2026-03-04', v: 0 },
//     { t: '2026-03-05', v: 0 },
//   ]

//   return (
//     <div className="min-h-screen bg-[#f8fafc] p-4 md:p-6 font-sans text-slate-700">
//       {/* HEADER */}
//       <div className="max-w-[1600px] mx-auto mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
//         <div className="flex items-center gap-3">
//           <div className="p-2 bg-blue-600 rounded-lg shadow-blue-200 shadow-lg text-white">
//             <LayoutDashboard size={20} />
//           </div>
//           <div>
//             <h1 className="text-xl font-black italic tracking-tighter leading-none">Панель управления</h1>
//             <p className="text-[10px] font-bold text-slate-400 italic mt-1 uppercase">
//               Объект: <span className="text-blue-600 font-black">ручей тест</span>
//             </p>
//           </div>
//         </div>
//         <div className="flex gap-2">
//           <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm text-[10px] font-black italic text-slate-600 uppercase">
//             День
//           </div>
//           <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm text-[10px] font-black italic text-slate-400 uppercase flex items-center">
//             <Calendar className="w-3 h-3 mr-2" /> 06.03.2026
//           </div>
//         </div>
//       </div>

//       <div className="max-w-[1600px] mx-auto space-y-6">
//         {/* РЯД 1: КРУГОВЫЕ ДИАГРАММЫ */}
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//           <StatusWidget
//             title="Статус проверки здоровья"
//             mainValue={1}
//             mainColor="#f59e0b"
//             items={[
//               { label: 'Здоровый', value: 0 },
//               { label: 'Требуется внимание', value: 1, color: 'text-amber-600 font-black' },
//               { label: 'Нездоровый', value: 0 },
//             ]}
//           />
//           <StatusWidget
//             title="Статус подключения"
//             mainValue={1}
//             mainColor="#cbd5e1"
//             items={[
//               { label: 'Онлайн', value: 0 },
//               { label: 'Офлайн', value: 1, color: 'text-slate-500 font-black' },
//             ]}
//           />
//           <StatusWidget
//             title="Состояние движения"
//             mainValue={1}
//             mainColor="#a855f7"
//             items={[
//               { label: 'Стационарный', value: 0 },
//               { label: 'Стоячий (заж. вкл.)', value: 0 },
//               { label: 'Движущийся', value: 0 },
//               { label: 'Движение (заж. вкл.)', value: 0 },
//               { label: 'Фактич. состояния нет', value: 1, color: 'text-purple-600 font-black' },
//               { label: 'Координаты отсутствуют', value: 0 },
//             ]}
//           />
//         </div>

//         {/* РЯД 2: ГЕОЗОНЫ И УВЕДОМЛЕНИЯ */}
//         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//           <EmptyDataBox
//             title="Геозоны с единицами измерения"
//             icon={<MapPin size={12} className="text-emerald-500" />}
//           />
//           <EmptyDataBox title="Последние уведомления" icon={<Bell size={12} className="text-blue-500" />} />
//           <EmptyDataBox
//             title="Лучшие автомобили по пробегу"
//             icon={<Trophy size={12} className="text-amber-500" />}
//             showInfo
//           />
//         </div>

//         {/* РЯД 3: ГРАФИК ПРОБЕГА И УРОВЕНЬ ВОДЫ */}
//         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
//           <ChartBox title="Пробег" unit="км" data={chartData} color="#3b82f6" />
//           <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-3xl p-6 text-white shadow-xl flex flex-col justify-between relative overflow-hidden h-[240px]">
//             <Droplets className="absolute right-[-5%] bottom-[-5%] w-32 h-32 text-white/10" />
//             <h3 className="text-[10px] font-black uppercase text-white/50 tracking-widest italic">
//               Уровень воды / FLS
//             </h3>
//             <div>
//               <div className="text-7xl font-black italic tracking-tighter">
//                 7<span className="text-2xl opacity-40 ml-1">cm</span>
//               </div>
//               <div className="mt-4 inline-flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg border border-white/10">
//                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
//                 <span className="text-[9px] font-bold uppercase italic tracking-tighter">Сигнал стабилен</span>
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* НОВЫЙ РЯД 4: ПОТРЕБЛЕНИЕ FLS И РАСХОД ТОПЛИВА */}
//         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-10">
//           <ChartBox title="Потребляется FLS" unit="л" data={chartData} color="#10b981" isFuel />
//           <EmptyDataBox
//             title="Лучшие показатели расхода топлива"
//             icon={<Gauge size={12} className="text-emerald-500" />}
//             showInfo
//           />
//         </div>
//       </div>
//     </div>
//   )
// }

// // --- КОМПОНЕНТЫ-ВИДЖЕТЫ ---

// function StatusWidget({
//   title,
//   mainValue,
//   mainColor,
//   items,
// }: {
//   title: string
//   mainValue: number
//   mainColor: string
//   items: DetailItem[]
// }) {
//   return (
//     <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
//       <div className="flex justify-between items-center mb-5">
//         <span className="text-[10px] font-black text-slate-800 uppercase italic tracking-tighter">{title}</span>
//         <span className="text-[8px] font-bold text-emerald-500 uppercase italic tracking-widest">онлайн-данные</span>
//       </div>
//       <div className="flex gap-4 items-start">
//         <div className="w-20 h-20 relative flex-shrink-0">
//           <ResponsiveContainer>
//             <PieChart>
//               <Pie data={[{ v: 1 }]} innerRadius={28} outerRadius={38} dataKey="v" stroke="none">
//                 <Cell fill={mainColor} />
//               </Pie>
//             </PieChart>
//           </ResponsiveContainer>
//           <div className="absolute inset-0 flex items-center justify-center font-black text-2xl italic">
//             {mainValue}
//           </div>
//         </div>
//         <div className="flex-grow space-y-1 mt-1">
//           {items.map((item, idx) => (
//             <div key={idx} className="flex justify-between items-center text-[9px] italic leading-tight">
//               <span
//                 className={`truncate max-w-[140px] ${item.value > 0 ? item.color || 'text-slate-900 font-bold' : 'text-slate-300'}`}>
//                 {item.label}
//               </span>
//               <span className={`${item.value > 0 ? 'text-slate-900 font-black' : 'text-slate-200'}`}>{item.value}</span>
//             </div>
//           ))}
//         </div>
//       </div>
//     </div>
//   )
// }

// function EmptyDataBox({ title, icon, showInfo }: { title: string; icon: any; showInfo?: boolean }) {
//   return (
//     <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col h-[200px]">
//       <div className="flex justify-between items-center mb-4">
//         <div className="flex items-center gap-2">
//           {icon}
//           <span className="text-[10px] font-black text-slate-800 uppercase italic tracking-tighter">{title}</span>
//           {showInfo && <Info size={10} className="text-slate-300" />}
//         </div>
//         <span className="text-[8px] font-bold text-emerald-500 uppercase italic">онлайн-данные</span>
//       </div>
//       <div className="flex-grow flex items-center justify-center">
//         <span className="text-[10px] font-bold text-slate-300 uppercase italic tracking-widest">Нет данных</span>
//       </div>
//     </div>
//   )
// }

// function ChartBox({
//   title,
//   unit,
//   data,
//   color,
//   isFuel,
// }: {
//   title: string
//   unit: string
//   data: any[]
//   color: string
//   isFuel?: boolean
// }) {
//   return (
//     <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm h-[240px]">
//       <div className="flex justify-between items-center mb-6">
//         <div className="flex items-center gap-2">
//           <h3 className="text-[10px] font-black uppercase text-slate-800 tracking-widest italic">{title}</h3>
//           {isFuel && <Info size={10} className="text-slate-300" />}
//         </div>
//         <div className="flex items-center gap-4">
//           <div className="flex items-center gap-2">
//             <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
//             <span className="text-[9px] font-bold italic text-slate-600">ручей тест</span>
//           </div>
//           <span className="text-[9px] font-black text-slate-400 italic">0 {unit}</span>
//         </div>
//       </div>
//       <div className="h-[140px] w-full">
//         <ResponsiveContainer width="100%" height="100%">
//           <LineChart data={data}>
//             <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
//             <XAxis dataKey="t" fontSize={9} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
//             <YAxis fontSize={9} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} domain={[0, 4]} />
//             <Tooltip contentStyle={{ fontSize: '10px', borderRadius: '8px' }} />
//             <Line type="stepAfter" dataKey="v" stroke={color} strokeWidth={2} dot={{ r: 2, fill: color }} />
//           </LineChart>
//         </ResponsiveContainer>
//       </div>
//     </div>
//   )
// }
