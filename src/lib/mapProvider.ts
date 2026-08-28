// ============================================================================
// MAP PROVIDER ABSTRACTION
// The safety map must not depend on a single vendor. A provider is activated
// by setting VITE_MAP_PROVIDER and (if needed) VITE_MAP_TILE_URL in .env.
// When none is configured the UI renders a calm, honest "map not yet
// connected" state instead of a broken map. No geographic data is invented:
// every plotted record carries source + status, and public viewers only ever
// receive locality-level references (never precise animal coordinates).
// ============================================================================

export type MapProviderKind = 'NONE' | 'LEAFLET_OSM' | 'GOOGLE' | 'MAPBOX' | 'CUSTOM';

export interface MapConfig {
  provider: MapProviderKind;
  tileUrl?: string;
  attribution: string;
}

export function getMapConfig(): MapConfig {
  const env = import.meta.env as Record<string, string | undefined>;
  const provider = (env.VITE_MAP_PROVIDER as MapProviderKind) || 'LEAFLET_OSM';
  if (provider === 'LEAFLET_OSM') {
    return {
      provider,
      tileUrl: env.VITE_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    };
  }
  return {
    provider,
    tileUrl: env.VITE_MAP_TILE_URL,
    attribution: provider === 'GOOGLE' ? 'Google' : provider === 'MAPBOX' ? '&copy; Mapbox' : 'Provider',
  };
}

/** Map layers the architecture supports (progressively enabled). */
export interface MapLayerDef {
  id: string;
  label: string;
  enabled: boolean;
  note?: string;
}

export const MAP_LAYERS: readonly MapLayerDef[] = [
  { id: 'incidents', label: 'Verified incidents', enabled: true },
  { id: 'alerts', label: 'Active danger zones', enabled: true },
  { id: 'localities', label: 'Settlements / safety nodes', enabled: true },
  { id: 'corridors', label: 'Known wildlife corridors', enabled: false, note: 'Requires official corridor mapping data' },
  { id: 'schools', label: 'Schools', enabled: false, note: 'Requires verified point data' },
  { id: 'hospitals', label: 'Hospitals', enabled: false, note: 'Requires verified point data' },
  { id: 'forest', label: 'Forest areas', enabled: false, note: 'Requires official boundary data' },
  { id: 'roads', label: 'Roads', enabled: false, note: 'Requires basemap provider data' },
];

/**
 * Public coordinate fuzzing: rounds a point to ~1.1 km precision so the
 * public map shows the general area without exposing exact positions.
 * Authorised responders receive precise coordinates through the admin
 * (database) path only.
 */
export function fuzzPublicCoords(lat: number, lng: number): { lat: number; lng: number } {
  const round = (v: number, step: number) => Math.round(v / step) * step;
  return { lat: round(lat, 0.01), lng: round(lng, 0.01) };
}
