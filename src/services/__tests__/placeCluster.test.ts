import { describe, it, expect } from 'vitest';
import { clusterPlaces, clusterKeyForRaw } from '../../../server/utils/placeCluster';

describe('placeCluster — national leaderboard from real typed addresses', () => {
  it('clusters the same city written different ways into one place', () => {
    const rows = [
      { place: 'Coimbatore', count: 5 },
      { place: 'coimbatore', count: 3 },
      { place: 'COIMBATORE', count: 2 },
    ];
    const result = clusterPlaces(rows);
    expect(result).toHaveLength(1);
    expect(result[0].count).toBe(10);
  });

  it('clusters multi-line addresses to their most significant place', () => {
    const rows = [
      { place: '6/6C Saravanathottam, Thudiyalur, Coimbatore 641034', count: 4 },
      { place: 'Saravanathottam, Thudiyalur, Coimbatore', count: 2 },
      { place: 'Coimbatore', count: 3 },
    ];
    const result = clusterPlaces(rows);
    // All three resolve to "coimbatore" → one cluster, count 9
    expect(result).toHaveLength(1);
    expect(result[0].count).toBe(9);
  });

  it('keeps distinct districts as separate places', () => {
    const rows = [
      { place: 'Kochi, Kerala', count: 7 },
      { place: 'Coimbatore, Tamil Nadu', count: 5 },
      { place: 'Bengaluru, Karnataka', count: 4 },
    ];
    const result = clusterPlaces(rows);
    expect(result).toHaveLength(3);
    // Ranked highest-first
    expect(result[0].place.toLowerCase()).toBe('kochi, kerala');
    expect(result[0].count).toBe(7);
  });

  it('strips pincodes and generic tokens before clustering', () => {
    expect(clusterKeyForRaw('New Bazar / Town Center, Gudalur 643212')).toBe('gudalur');
    expect(clusterKeyForRaw("O'Valley Town Panchayat")).toContain('valley');
  });

  it('ranks by count descending, then name ascending', () => {
    const rows = [
      { place: 'Pandalur', count: 3 },
      { place: 'Gudalur', count: 5 },
      { place: 'Devala', count: 5 },
    ];
    const result = clusterPlaces(rows);
    expect(result[0].count).toBe(5);
    expect(result[1].count).toBe(5);
    // Same count → alphabetical
    expect(result[0].place.localeCompare(result[1].place)).toBeLessThan(0);
    expect(result[2].count).toBe(3);
  });

  it('handles empty / whitespace-only addresses gracefully', () => {
    const rows = [
      { place: 'Gudalur', count: 2 },
      { place: '', count: 1 },
      { place: '   ', count: 1 },
    ];
    const result = clusterPlaces(rows);
    // Empty ones collapse into a single "Not specified" bucket
    const buckets = result.map((r) => r.place.toLowerCase());
    expect(buckets).toContain('gudalur');
  });
});
