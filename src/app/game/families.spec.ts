import { FAMILIES, FAMILY_IDS, MALLOW, starterName, starterOffer } from './families';
import { createInitialState, LocalGameHost } from './host';
import { activeCritter } from './model';
import { validateSave } from './storage';

describe('the nine families and the starter offer', () => {
  it('gives every family the same provisional stat total', () => {
    for (const id of FAMILY_IDS) {
      const { strength, endurance, speed, intelligence } = FAMILIES[id].stats;
      expect(strength + endurance + speed + intelligence, id).toBe(18);
    }
  });

  it('always offers Mallow beside two other, different families, drawn from the seed', () => {
    for (let seed = 0; seed < 200; seed++) {
      const offer = starterOffer(seed * 7919);
      expect(offer).toHaveLength(3);
      expect(offer[0]).toEqual(MALLOW);
      expect(new Set(offer.map((candidate) => candidate.speciesId)).size).toBe(3);
      expect(new Set(offer.map((candidate) => candidate.id)).size).toBe(3);
      expect(starterOffer(seed * 7919)).toEqual(offer);
    }
  });

  it('can offer every other family, with traits from that family', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed < 400; seed++)
      for (const candidate of starterOffer(seed * 2654435761).slice(1)) {
        seen.add(candidate.speciesId);
        const family = FAMILIES[candidate.speciesId];
        expect(family.coats).toContain(candidate.visualTraits.coat);
        expect(family.accents).toContain(candidate.visualTraits.accent);
        expect(family.names).toContain(candidate.name);
        expect(candidate.stats).toEqual(family.stats);
        expect(candidate.visualTraits.size).toBeGreaterThanOrEqual(0.9);
        expect(candidate.visualTraits.size).toBeLessThanOrEqual(1.1);
      }
    expect([...seen].sort()).toEqual(FAMILY_IDS.filter((id) => id !== 'canine').sort());
  });

  it('accepts tidy names and refuses unusable ones', () => {
    expect(starterName('  Clover   Bean ')).toBe('Clover Bean');
    expect(starterName("O'Malley")).toBe("O'Malley");
    expect(starterName('Zoë')).toBe('Zoë');
    for (const bad of ['', '   ', '1st', 'A name that is far too long', '<b>'])
      expect(starterName(bad), bad).toBeNull();
  });

  it('starts a valid, playable household with any offered critter', () => {
    for (const candidate of starterOffer(424242)) {
      const state = createInitialState({ ...candidate, name: 'Nib' }, 424242);
      expect(() => validateSave(state)).not.toThrow();
      const companion = activeCritter(state);
      expect(companion).toMatchObject({
        id: candidate.id,
        name: 'Nib',
        speciesId: candidate.speciesId,
        stats: candidate.stats,
        visualTraits: candidate.visualTraits,
        ownerId: state.player.id,
      });
      expect(state.seed).toBe(424242);
      const host = new LocalGameHost(state);
      host.update(5);
      expect(() => validateSave(JSON.parse(JSON.stringify(host.state)))).not.toThrow();
    }
  });
});
