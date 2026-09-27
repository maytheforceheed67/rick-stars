/**
 * Suspicion. Calm rooms are full of watchers (customs agents; later episodes bring their own)
 * and scanners. Running, dashing or firing near watchers raises suspicion; sneaking (Shift) keeps
 * it low; every scanner you pass adds some. Rooms crossed undetected pay Scrap. A room with a
 * final checkpoint ('Z' markers) always blows the cover, and a full meter blows it sooner.
 *
 * createSuspicion() builds the mechanic from a setup, so a later episode can reuse it with its
 * own watchers, props and ending (Jerry sneaking past dog patrols in S01E02). The Pilot's own
 * version is `suspicion` at the bottom: Customs, where the blown cover turns every room into a
 * fight.
 */
import type { ContentId, EnemyRef, EpisodeId, MechanicApi, MechanicDef, MechanicInstance, RoomInfo, Vec } from '../../../../engine/types';
import { ECONOMY, PILOT } from '../../../balance';
import { CUSTOMS_AGENTS } from '../enemies';
import { coverBlown } from '../scenes';

export interface SuspicionSetup {
  id: string;
  name: string;
  help: string;
  firstAppears: EpisodeId;
  canon: boolean;
  /** Watchers standing calmly on the calm rooms' 'A' markers. */
  watchers: ContentId[];
  /** Enemies on 'A' markers of rooms first entered after the cover is blown (none = empty rooms). */
  hostiles?: ContentId[];
  /** Props on 'S' scanner markers and at the 'Z' checkpoint. */
  scannerArt: string;
  checkpointArt: string;
  /** Objective in calm rooms, and in the checkpoint room. */
  objective: string;
  checkpointObjective: string;
  /** Hint shown in the first calm room. */
  firstHint: string;
  /** Meter label once it's over ("COVER BLOWN", "CAUGHT"). */
  blownLabel: string;
  /** The cover is blown: play the moment. Runs once. */
  onBlown(api: MechanicApi): void;
}

export function createSuspicion(setup: SuspicionSetup): MechanicDef {
  return {
    id: setup.id,
    name: setup.name,
    help: setup.help,
    firstAppears: setup.firstAppears,
    canon: setup.canon,
    create(api): MechanicInstance {
      const S = PILOT.suspicion;
      let value = 0;
      let blown = false;
      let scanners: Vec[] = [];
      let insideScanner = new Set<number>();
      let checkpoint: Vec[] = [];
      let checkpointTimer = 0;
      let firstCalm = true;
      /** Calm room we're in, paid out when the player leaves it undetected. */
      let pendingBonus: number | null = null;
      const paid = new Set<number>();
      /** Calm watchers in the current room. */
      let current: EnemyRef[] = [];

      const watchersNear = (radius: number): boolean =>
        current.some((e) => e.alive && e.passive && Math.hypot(e.x - api.player.x, e.y - api.player.y) < radius);

      const add = (amount: number) => {
        if (blown) return;
        value = Math.min(100, value + amount);
        if (value >= 100) blowCover();
      };

      function blowCover(): void {
        if (blown) return;
        blown = true;
        value = 100;
        current = [];
        api.sfx('alarm');
        api.flash(0xff3040, 200);
        api.shake(8, 300);
        api.hint(null);
        setup.onBlown(api);
      }

      function placeWatchers(room: RoomInfo, hostile: boolean): void {
        const here = api.here();
        const pool = hostile ? (setup.hostiles ?? []) : setup.watchers;
        if (!pool.length) return;
        for (const p of room.markers('A')) {
          const e = here.spawnEnemy(api.rng.pick(pool), p.x, p.y, { passive: !hostile, delay: hostile ? 0.6 : 0 });
          if (e && !hostile) current.push(e);
        }
      }

      return {
        onActStart() {
          value = 0;
          blown = false;
          firstCalm = true;
          paid.clear();
          pendingBonus = null;
        },
        onRoomEnter(room) {
          current = [];
          scanners = [];
          insideScanner = new Set();
          checkpoint = [];
          if (pendingBonus !== null && !blown && !paid.has(pendingBonus) && pendingBonus !== room.id) {
            paid.add(pendingBonus);
            api.addScrap(ECONOMY.undetectedRoomBonus, api.player.x, api.player.y);
            api.toast(`+${ECONOMY.undetectedRoomBonus} Scrap: slipped through undetected`, { color: 0xffd54a, seconds: 2 });
          }
          pendingBonus = null;
          const here = api.here();
          if (room.kind === 'calm' && !blown) {
            placeWatchers(room, false);
            scanners = room.markers('S');
            for (const s of scanners) here.addProp({ art: setup.scannerArt, x: s.x, y: s.y + 22 });
            checkpoint = room.markers('Z');
            if (checkpoint.length) {
              const c = checkpoint[1] ?? checkpoint[0];
              here.addProp({ art: setup.checkpointArt, x: c.x, y: c.y + 40 });
              checkpointTimer = 3;
              here.setObjective(setup.checkpointObjective);
            } else {
              here.setObjective(setup.objective);
            }
            if (firstCalm && room.firstVisit) {
              firstCalm = false;
              api.hint(setup.firstHint);
              api.after(7, () => api.hint(null));
            }
            pendingBonus = room.id;
          } else if (room.kind === 'combat' && room.firstVisit && blown) {
            placeWatchers(room, true);
          }
        },
        update(dt) {
          if (blown) return;
          const room = api.room();
          if (room.kind !== 'calm') return;
          const p = api.player;
          const near = watchersNear(S.agentRadius);
          if (near && p.moving) add((p.sneaking ? S.sneakNearAgent : S.runNearAgent) * dt);
          else if (!near) value = Math.max(0, value - S.decay * dt);
          scanners.forEach((s, i) => {
            const inside = Math.hypot(s.x - p.x, s.y - p.y) < 34;
            if (inside && !insideScanner.has(i)) {
              insideScanner.add(i);
              api.sfx('scanner');
              add(S.scanner);
            } else if (!inside) insideScanner.delete(i);
          });
          if (checkpoint.length) {
            checkpointTimer -= dt;
            const atScanner = checkpoint.some((c) => Math.hypot(c.x - p.x, c.y - p.y) < 150);
            if (atScanner || checkpointTimer <= 0) blowCover();
          }
        },
        onPlayerEvent(e) {
          if (blown || api.room().kind !== 'calm') return;
          if (e.type === 'fire' && watchersNear(S.agentRadius * 1.6)) add(S.fire);
          if (e.type === 'dash' && watchersNear(S.agentRadius)) add(S.dash);
        },
        hud() {
          return {
            label: blown ? setup.blownLabel : 'Suspicion',
            value: value / 100,
            color: blown || value > 70 ? 0xff4a3d : value > 40 ? 0xffa94d : 0x6fd0ff,
            alert: blown || value > 70,
          };
        },
      };
    },
  };
}

/** Customs: the seeds set off the scanners, Rick hands over his gun, and every room is a fight. */
export const suspicion = createSuspicion({
  id: 'suspicion',
  name: 'Suspicion',
  help: 'Walk, sneak (Shift) past agents. Running, dashing and shooting near them, or passing scanners, raises suspicion.',
  firstAppears: 'S01E01',
  canon: false,
  watchers: ['gromflomite-clerk', 'gromflomite-guard'],
  hostiles: CUSTOMS_AGENTS,
  scannerArt: 'scanner-gate',
  checkpointArt: 'big-scanner',
  objective: 'Get through customs. Act natural.',
  checkpointObjective: 'Final checkpoint. Act natural...',
  firstHint: "Hold Shift to sneak. Don't run, dash or shoot near agents. Scanners notice you too.",
  blownLabel: 'COVER BLOWN',
  onBlown: (api) => {
    api.here().actScene(coverBlown(), () => {
      api.flags.coverBlown = true;
      // Skipping the scene still hands the gun over.
      api.giveActWeapon();
      const here = api.here();
      here.makeCombat();
      here.setObjective(null);
      api.convertRooms('calm', 'combat');
      api.toast('COVER BLOWN! Every room is a fight now.', { color: 0xff4a3d, seconds: 3 });
    });
  },
});
