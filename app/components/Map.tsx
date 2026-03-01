'use client';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Импортируем типы явно для TypeScript
import type { LatLngExpression } from 'leaflet';

interface MapProps {
  pos: [number, number];
  name: string;
}

export default function Map({ pos, name }: MapProps) {
  // Приводим позицию к типу, который понимает Leaflet
  const position: LatLngExpression = pos;

  // Создаем иконку через стандартный L.divIcon
  // Это уберет ошибку "Property 'icon' does not exist"
  const customIcon = typeof window !== 'undefined' ? L.divIcon({
    html: `
      <div style="display: flex; flex-direction: column; align-items: center;">
        <div style="width: 0; height: 0; border-left: 8px solid transparent; border-right: 8px solid transparent; border-bottom: 16px solid #ef4444;"></div>
        <div style="background: white; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: bold; color: #ef4444; border: 1px solid #ef4444; margin-top: 4px; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
          ${name}
        </div>
      </div>
    `,
    className: '',
    iconSize: [20, 40],
    iconAnchor: [10, 16], // Точка привязки — верхушка стрелки
  }) : null;

  return (
    <div className="h-[400px] w-full rounded-2xl overflow-hidden border border-slate-700 shadow-lg">
      <MapContainer 
        center={position} 
        zoom={16} 
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {customIcon && (
          <Marker position={position} icon={customIcon}>
            <Popup>{name}</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}