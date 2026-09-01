// Voice of Gudalur — MapLibre GL Map Component
import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { point, buffer, distance } from '@turf/turf';

interface MapMarker {
  id: string; lng: number; lat: number; title?: string; type?: 'sighting' | 'incident' | 'user'; onClick?: () => void;
}
interface Corridor { coordinates: [number, number][]; name?: string; color?: string; }
interface AnimalLocation { lng: number; lat: number; animalType: string; count?: number; }

interface MapLibreMapProps {
  center?: [number, number]; zoom?: number; markers?: MapMarker[]; corridors?: Corridor[];
  animalLocations?: AnimalLocation[]; onMapClick?: (lng: number, lat: number) => void;
  onMarkerClick?: (marker: MapMarker) => void; height?: string; showTerrain?: boolean; show3D?: boolean;
}

export const MapLibreMap: React.FC<MapLibreMapProps> = ({
  center = [76.4925, 11.5034], zoom = 12, markers = [], corridors = [], animalLocations = [],
  onMapClick, onMarkerClick, height = '400px', showTerrain = true, show3D = false,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;
    const mapInstance = new maplibregl.Map({
      container: mapContainer.current,
      style: { version: 8, sources: { 'osm-tiles': { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256, attribution: '&copy; OSM' } }, layers: [{ id: 'osm-layer', type: 'raster', source: 'osm-tiles', minzoom: 0, maxzoom: 19 }] },
      center, zoom, pitch: show3D ? 55 : 0, canvasContextAttributes: { antialias: true },
    });
    mapInstance.addControl(new maplibregl.NavigationControl(), 'top-right');
    mapInstance.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');
    mapInstance.on('load', () => {
      setMapLoaded(true); map.current = mapInstance;
      if (showTerrain) {
        mapInstance.addSource('map-dem', { type: 'raster-dem', tiles: ['https://demotiles.maplibre.org/terrain-rgb/{z}/{x}/{y}.png'], tileSize: 256 });
        mapInstance.setTerrain({ source: 'map-dem', exaggeration: 1.5 });
      }
      if (show3D) {
        // MapLibre GL v4+ sky atmosphere — set via setSky(), not addLayer()
        mapInstance.setSky({
          'sky-color': '#89C4F4',
          'horizon-color': '#DCF2FF',
          'fog-color': '#FFFFFF',
          'sky-horizon-blend': 0.5,
          'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 0, 10, 1],
        });
      }
    });
    mapInstance.on('click', (e) => onMapClick?.(e.lngLat.lng, e.lngLat.lat));
    return () => { mapInstance.remove(); map.current = null; setMapLoaded(false); };
  }, []);

  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current.clear();
    markers.forEach((m) => {
      const el = document.createElement('div');
      el.style.cssText = `width:24px;height:24px;border-radius:50%;background:${m.type === 'sighting' ? '#059669' : m.type === 'incident' ? '#dc2626' : '#2563eb'};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);cursor:pointer;`;
      const marker = new maplibregl.Marker({ element: el }).setLngLat([m.lng, m.lat]).addTo(map.current!);
      if (m.title) marker.setPopup(new maplibregl.Popup({ offset: 24 }).setText(m.title));
      el.addEventListener('click', () => { m.onClick?.(); onMarkerClick?.(m); });
      markersRef.current.set(m.id, marker);
    });
  }, [markers, mapLoaded]);

  const flyTo = useCallback((lng: number, lat: number, z?: number) => {
    map.current?.flyTo({ center: [lng, lat], zoom: z || 15, duration: 2000 });
  }, []);

  return (
    <div className="relative rounded-2xl overflow-hidden shadow-lg">
      <div ref={mapContainer} style={{ width: '100%', height }} />
      {!mapLoaded && <div className="absolute inset-0 flex items-center justify-center bg-slate-100"><div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" /></div>}
    </div>
  );
};

export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const d = distance(point([lng1, lat1]), point([lng2, lat2]), { units: 'kilometers' });
  return Math.round(d * 100) / 100;
}

export function createBufferZone(lat: number, lng: number, radiusKm: number) {
  return buffer(point([lng, lat]), radiusKm, { units: 'kilometers' });
}

