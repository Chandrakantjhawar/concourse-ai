import { describe, it, expect } from 'vitest';
import { getStadiums, getStadium, getZones, getSOPSnippets } from './data-loader.js';

describe('Data Loader Service', () => {
  it('should return a list of stadiums', () => {
    const stadiums = getStadiums();
    expect(Array.isArray(stadiums)).toBe(true);
    expect(stadiums.length).toBeGreaterThan(0);
    expect(stadiums[0]).toHaveProperty('id');
    expect(stadiums[0]).toHaveProperty('name');
  });

  it('should return a specific stadium by ID', () => {
    const stadiums = getStadiums();
    const firstId = stadiums[0]!.id;
    
    const stadium = getStadium(firstId);
    expect(stadium).toBeDefined();
    expect(stadium?.id).toBe(firstId);
  });

  it('should return undefined for an invalid stadium ID', () => {
    const stadium = getStadium('invalid-id-xyz');
    expect(stadium).toBeUndefined();
  });

  it('should return zones for a valid stadium', () => {
    const stadiums = getStadiums();
    const firstId = stadiums[0]!.id;
    
    const zones = getZones(firstId);
    expect(Array.isArray(zones)).toBe(true);
    if (zones.length > 0) {
      expect(zones[0]).toHaveProperty('id');
      expect(zones[0]).toHaveProperty('name');
    }
  });

  it('should return empty array of zones for invalid stadium', () => {
    const zones = getZones('invalid-id-xyz');
    expect(zones).toEqual([]);
  });

  it('should return SOPs for a specific role', () => {
    const sops = getSOPSnippets(['security', 'medical']);
    expect(Array.isArray(sops)).toBe(true);
    if (sops.length > 0) {
      expect(sops[0]).toHaveProperty('title');
      expect(sops[0]).toHaveProperty('body');
    }
  });
});
