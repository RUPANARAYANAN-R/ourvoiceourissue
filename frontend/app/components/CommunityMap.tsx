'use client';

import React from 'react';
import Map, { Marker, NavigationControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

interface CommunityMapProps {
  clusters: Array<{
    longitude?: number;
    latitude?: number;
    severity?: string;
    count?: number;
  }>;
}

export default function CommunityMap({ clusters }: CommunityMapProps) {
  return (
    <Map
      initialViewState={{
        longitude: 78.6569, // Center of Tamil Nadu
        latitude: 11.1271,
        zoom: 6,
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
      <NavigationControl position="bottom-right" />

      {clusters.map((cluster, i) => (
        <Marker
          key={i}
          longitude={cluster.longitude || 78.6569 + ((i % 5) - 2) * 0.2}
          latitude={cluster.latitude || 11.1271 + ((i % 3) - 1) * 0.2}
        >
          <div className="relative flex items-center justify-center">
            <div
              className={`absolute w-16 h-16 rounded-full opacity-30 animate-ping ${
                cluster.severity === 'CRITICAL' ? 'bg-[var(--nk-critical)]' : 'bg-[var(--nk-warning)]'
              }`}
            ></div>
            <div
              className={`w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white text-xs font-bold ${
                cluster.severity === 'CRITICAL' ? 'bg-[var(--nk-critical)]' : 'bg-[var(--nk-warning)]'
              }`}
            >
              {cluster.count || 1}
            </div>
          </div>
        </Marker>
      ))}
    </Map>
  );
}
