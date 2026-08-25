'use client';

import React from 'react';
import Map, { Marker } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

interface DashboardMapProps {
  mapPoints: Array<{
    longitude: number;
    latitude: number;
    weight: number;
    category?: string;
  }>;
}

export default function DashboardMap({ mapPoints }: DashboardMapProps) {
  return (
    <Map
      initialViewState={{
        longitude: 78.6569, // Center of Tamil Nadu
        latitude: 11.1271,
        zoom: 5.5,
      }}
      mapStyle={{
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '&copy; OpenStreetMap Contributors',
          },
        },
        layers: [
          {
            id: 'osm',
            type: 'raster',
            source: 'osm',
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      }}
      attributionControl={false}
      style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
    >
      {mapPoints.map((point, idx) => (
        <Marker key={idx} longitude={point.longitude} latitude={point.latitude}>
          <div
            className={`rounded-full border-2 border-white shadow-lg ${
              point.weight >= 4
                ? 'w-4 h-4 bg-[var(--nk-priority-critical)] animate-pulse'
                : point.weight === 3
                ? 'w-3 h-3 bg-[var(--nk-priority-high)]'
                : point.weight === 2
                ? 'w-3 h-3 bg-[var(--nk-priority-medium)]'
                : 'w-2 h-2 bg-[var(--nk-priority-low)]'
            }`}
            title={point.category}
          />
        </Marker>
      ))}
    </Map>
  );
}
