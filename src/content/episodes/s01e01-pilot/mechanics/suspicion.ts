/**
 * Suspicion (Interdimensional Customs). The first rooms are calm queue rooms full of agents and
 * scanners. Running, dashing or firing near agents raises suspicion; sneaking (Shift) keeps it
 * low; every scanner you pass adds some. Rooms crossed undetected pay Scrap. The cover is always
 * blown at the final checkpoint (it's canon), and sooner if the meter fills.
 */
import type { EnemyRef, MechanicDef, MechanicInstance, RoomInfo, Vec } from '../../../../engine/types';
import { ECONOMY, PILOT } from '../../../balance';
import { CUSTOMS_AGENTS } from '../enemies';
import { coverBlown } from '../scenes';

const CALM_AGENTS = ['gromflomite-clerk', 'gromflomite-guard'];

export const suspicion: MechanicDef = {
  id: 'suspicion',
  name: 'Suspicion',
  help: 'Walk, sneak (Shift) past agents. Running, dashing and shooting near them, or passing scanners, raises suspicion.',
  firstAppears: 'S01E01',
  canon: false,
  create(api): MechanicInstance {
    const S = PILOT.suspicion;
    let value = 0;
    let blown = false;
    let scanners: Vec[] = [];
    let insideScanner = new Set<number>();
    let checkpoint: Vec[] = [];
    let checkpointTimer = 0;
    /** Calm room we're in, paid out when the player leaves it undetected. */
    let pendingBonus: number | null = null;
    const paid = new Set<number>();
    /** Calm agents in the current room. */
    let current: EnemyRef[] = [];

    const agentsNear = (radius: number): boolean =>
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
      api.sfx('alarm');
      api.flash(0xff3040, 200);
      api.shake(8, 300);
      api.hint(null);
      api.here().actScene(coverBlown(), () => {
        api.flags.coverBlown = true;
        // Skipping the scene still hands the gun over.
        api.giveActWeapon();
        const here = api.here();
        here.makeCombat();
        here.setObjective(null);
        api.convertRooms('calm', 'combat');
        current = [];
        api.toast('COVER BLOWN! Every room is a fight now.', { color: 0xff4a3d, seconds: 3 });
      });
    }

    function spawnAgents(room: RoomInfo, hostile: boolean): void {
      const here = api.here();
      for (const p of room.markers('A')) {
        const id = hostile ? api.rng.pick(CUSTOMS_AGENTS) : api.rng.pick(CALM_AGENTS);
        const e = here.spawnEnemy(id, p.x, p.y, { passive: !hostile, delay: hostile ? 0.6 : 0 });
        if (e && !hostile) current.push(e);
      }
    }

    return {
      onActStart() {
        value = 0;
        blown = false;
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
          spawnAgents(room, false);
          scanners = room.markers('S');
          for (const s of scanners) here.addProp({ art: 'scanner-gate', x: s.x, y: s.y + 22 });
          if (room.isLastPrefix) {
            checkpoint = room.markers('Z');
            if (checkpoint.length) here.addProp({ art: 'big-scanner', x: checkpoint[1]?.x ?? checkpoint[0].x, y: (checkpoint[1]?.y ?? checkpoint[0].y) + 40 });
            checkpointTimer = 3;
            here.setObjective('Final checkpoint. Act natural...');
          } else {
            here.setObjective('Get through customs. Act natural.');
          }
          if (room.prefixIndex === 0 && room.firstVisit) {
            api.hint("Hold Shift to sneak. Don't run, dash or shoot near agents. Scanners notice you too.");
            api.after(7, () => api.hint(null));
          }
          pendingBonus = room.id;
        } else if (room.kind === 'combat' && room.prefixIndex !== undefined && room.firstVisit && blown) {
          spawnAgents(room, true);
        }
      },
      update(dt) {
        if (blown) return;
        const room = api.room();
        if (room.kind !== 'calm') return;
        const p = api.player;
        const near = agentsNear(S.agentRadius);
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
        if (room.isLastPrefix) {
          checkpointTimer -= dt;
          const atScanner = checkpoint.some((c) => Math.hypot(c.x - p.x, c.y - p.y) < 150);
          if (atScanner || checkpointTimer <= 0) blowCover();
        }
      },
      onPlayerEvent(e) {
        if (blown || api.room().kind !== 'calm') return;
        if (e.type === 'fire' && agentsNear(S.agentRadius * 1.6)) add(S.fire);
        if (e.type === 'dash' && agentsNear(S.agentRadius)) add(S.dash);
      },
      hud() {
        return {
          label: blown ? 'COVER BLOWN' : 'Suspicion',
          value: value / 100,
          color: blown || value > 70 ? 0xff4a3d : value > 40 ? 0xffa94d : 0x6fd0ff,
          alert: blown || value > 70,
        };
      },
    };
  },
};
