import { describe, expect, it } from 'vitest';
import { createRegistry } from '../src/content/registry';
import { buildFixedFloor, generateFloor, type Floor, type FloorConfig } from '../src/engine/dungeon/generate';
import { episodeActs } from '../src/engine/registry';
import { Rng } from '../src/engine/rng';
import type { ActDef } from '../src/engine/types';

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

function reachable(floor: Floor): Set<number> {
  const seen = new Set([floor.startId]);
  const queue = [floor.startId];
  while (queue.length) {
    const r = floor.rooms[queue.shift()!];
    for (const n of Object.values(r.neighbors)) {
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
        expect(reachable(floor).size).toBe(floor.rooms.length);
      }
    }
  });
});
