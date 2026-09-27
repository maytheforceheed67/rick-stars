import { describe, expect, it } from 'vitest';
import { createRegistry } from '../src/content/registry';
import { buildFixedFloor, generateFloor, regionOf, type Floor, type FloorConfig, type FloorRoom } from '../src/engine/dungeon/generate';
import { episodeActs } from '../src/engine/registry';
import { Rng } from '../src/engine/rng';
import type { ActDef, FixedLayout } from '../src/engine/types';

const reg = createRegistry();

function floorConfig(act: ActDef): FloorConfig {
  if (act.layout.kind !== 'procedural') throw new Error('not procedural');
  const stage = act.finale[0];
  const special = act.specialRoom ? reg.specialRooms.get(act.specialRoom)! : undefined;
  return {
    roomCount: act.layout.roomCount,
    templates: act.layout.templates,
    startTemplate: act.layout.startTemplate,
    treasureTemplate: act.layout.treasureTemplate,
    shopTemplate: act.layout.shopTemplate,
    special: special ? { id: special.id, templates: special.templates } : undefined,
    finaleTemplate: stage.kind === 'boss' ? stage.template : reg.encounters.get(stage.encounter)!.template,
    calmPrefix: act.layout.calmPrefix,
  };
}

/** Rooms reachable from the start through doors, plus any story trips (Rick's ship across town). */
function reachable(floor: Floor, trips: FixedLayout['trips'] = []): Set<number> {
  const at = (p: { x: number; y: number }) => floor.rooms.find((r) => r.x === p.x && r.y === p.y)?.id;
  const seen = new Set([floor.startId]);
  const queue = [floor.startId];
  while (queue.length) {
    const r = floor.rooms[queue.shift()!];
    const byTrip = trips.filter((t) => at(t.from) === r.id).map((t) => at(t.to));
    for (const n of [...Object.values(r.neighbors), ...byTrip]) {
      if (n === undefined || seen.has(n)) continue;
      seen.add(n);
      queue.push(n);
    }
  }
  return seen;
}

const procedural = [...reg.episodes.values()].flatMap((ep) => episodeActs(ep).filter((a) => a.layout.kind === 'procedural'));

describe('floor generation', () => {
  it('has procedural acts to test', () => {
    expect(procedural.length).toBeGreaterThanOrEqual(3);
  });

  for (const act of procedural) {
    it(`${act.id}: 1,000 seeds all produce valid floors`, () => {
      const cfg = floorConfig(act);
      for (let i = 0; i < 1000; i++) {
        const floor = generateFloor(cfg, new Rng(`seed-${i}`).fork(`floor:${act.id}`));
        const where = `${act.id} seed-${i}`;
        // Acts are 8-12 rooms in all, counting the start room and any calm prefix.
        expect(floor.rooms.length, where).toBeGreaterThanOrEqual(8);
        expect(floor.rooms.length, where).toBeLessThanOrEqual(12);
        // Every room is reachable from the start room.
        expect(reachable(floor).size, where).toBe(floor.rooms.length);
        // Exactly one finale, and the required special rooms exist.
        const kinds = floor.rooms.map((r) => r.kind);
        expect(kinds.filter((k) => k === 'finale'), where).toHaveLength(1);
        expect(kinds.filter((k) => k === 'start'), where).toHaveLength(1);
        expect(kinds.filter((k) => k === 'treasure'), where).toHaveLength(1);
        expect(kinds.filter((k) => k === 'shop'), where).toHaveLength(1);
        if (cfg.special) expect(kinds.filter((k) => k === 'special'), where).toHaveLength(1);
        // No two rooms share a grid cell.
        const cells = new Set(floor.rooms.map((r) => `${r.x},${r.y}`));
        expect(cells.size, where).toBe(floor.rooms.length);
        // Doors are symmetric: if A opens onto B, B opens back onto A.
        for (const r of floor.rooms) {
          for (const [dir, n] of Object.entries(r.neighbors)) {
            const back = { N: 'S', S: 'N', E: 'W', W: 'E' }[dir] as 'N' | 'S' | 'E' | 'W';
            expect(floor.rooms[n!].neighbors[back], where).toBe(r.id);
          }
        }
        // Special rooms and the finale are dead ends.
        for (const r of floor.rooms) {
          if (['finale', 'treasure', 'shop', 'special'].includes(r.kind)) expect(Object.keys(r.neighbors), where).toHaveLength(1);
          expect(reg.templates.has(r.template), `${where} template ${r.template}`).toBe(true);
        }
        // Calm prefix: a chain leading out of the start room; the rest of the floor hangs off its end.
        if (cfg.calmPrefix) {
          const prefix = floor.rooms.filter((r) => r.prefixIndex !== undefined).sort((a, b) => a.prefixIndex! - b.prefixIndex!);
          expect(prefix.length, where).toBeGreaterThanOrEqual(cfg.calmPrefix.count[0]);
          expect(prefix.length, where).toBeLessThanOrEqual(cfg.calmPrefix.count[1]);
          prefix.forEach((r, k) => {
            expect(r.depth, where).toBe(k + 1);
            expect(r.kind, where).toBe('calm');
          });
          expect(prefix[prefix.length - 1].lastPrefix, where).toBe(true);
          expect(floor.rooms[floor.startId].neighbors && Object.keys(floor.rooms[floor.startId].neighbors)).toHaveLength(1);
          for (const r of floor.rooms) {
            if (r.kind === 'start' || r.prefixIndex !== undefined) continue;
            expect(r.depth, where).toBeGreaterThan(prefix.length);
          }
        }
      }
    });
  }

  const withRegions = procedural.filter((a) => a.layout.kind === 'procedural' && a.layout.regions?.length);

  it('has an act that walks from one place into the next (the dreams)', () => {
    expect(withRegions.length).toBeGreaterThanOrEqual(1);
  });

  for (const act of withRegions) {
    it(`${act.id}: 1,000 seeds all cross every region, from the start to the finale`, () => {
      const cfg = floorConfig(act);
      const n = (act.layout.kind === 'procedural' ? act.layout.regions!.length : 0) + 1;
      for (let i = 0; i < 1000; i++) {
        const floor = generateFloor(cfg, new Rng(`seed-${i}`).fork(`floor:${act.id}`));
        const where = `${act.id} seed-${i}`;
        const region = (r: FloorRoom) => regionOf(floor, r, n);
        expect(region(floor.rooms[floor.startId]), where).toBe(0);
        expect(region(floor.rooms[floor.finaleId!]), where).toBe(n - 1);
        for (let k = 0; k < n; k++) expect(floor.rooms.some((r) => region(r) === k), `${where} region ${k}`).toBe(true);
        // Deeper is never an earlier region, so walking on never steps back into the last place.
        for (const r of floor.rooms) {
          for (const nb of Object.values(r.neighbors)) {
            const next = floor.rooms[nb!];
            if (next.depth > r.depth) expect(region(next), where).toBeGreaterThanOrEqual(region(r));
          }
        }
        // A fight past the first region (Scary Terry shows up after the first clear there).
        expect(floor.rooms.some((r) => region(r) >= 1 && r.kind === 'combat'), where).toBe(true);
      }
    });
  }

  it('keeps floors without regions in one place', () => {
    const cfg = floorConfig(procedural[0]);
    const floor = generateFloor(cfg, new Rng('one-place'));
    expect(floor.rooms.every((r) => regionOf(floor, r, 1) === 0)).toBe(true);
  });

  it('the same seed produces the same floor', () => {
    for (const act of procedural) {
      const cfg = floorConfig(act);
      const a = generateFloor(cfg, new Rng('same').fork(act.id));
      const b = generateFloor(cfg, new Rng('same').fork(act.id));
      expect(a).toEqual(b);
    }
  });

  it('different seeds usually produce different floors', () => {
    const cfg = floorConfig(procedural[0]);
    const layouts = new Set(Array.from({ length: 20 }, (_, i) => JSON.stringify(generateFloor(cfg, new Rng(`d${i}`)).rooms.map((r) => [r.x, r.y, r.kind]))));
    expect(layouts.size).toBeGreaterThan(15);
  });

  it('builds fixed floors with doors between neighbors', () => {
    for (const ep of reg.episodes.values()) {
      for (const act of episodeActs(ep)) {
        if (act.layout.kind !== 'fixed') continue;
        const floor = buildFixedFloor(act.layout);
        expect(reachable(floor, act.layout.trips).size, act.id).toBe(floor.rooms.length);
      }
    }
  });
});
