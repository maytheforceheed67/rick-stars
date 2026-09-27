/**
 * Scary Terry (Act 2, the dreams within dreams). Once he's met in the centaur's dream he hunts
 * Morty from room to room: a few seconds after Morty walks in, Terry steps in too. He can't be
 * killed; hits only shove and daze him. The only way to shake him is to dive into another
 * dreamer's dream: a sleeping dreamer in the room (press E), or crossing into the next dream.
 * Then he follows a while later.
 */
import type { EnemySelf, MechanicDef, MechanicInstance, PropHandle, RoomInfo } from '../../../../engine/types';
import { LAWNMOWER_DOG } from '../../../balance';
import { LINES } from '../dialogue';
import { terryArrives } from '../scenes';

/** Which sleeper dozes in each dream: Mrs. Pancakes' street, the centaur's dream, the little girl's. */
const DREAMERS = ['dreamer-sleeper', 'dreamer-sheep', 'dreamer-doll'];

export const scaryTerryHunt: MechanicDef = {
  id: 'scary-terry-hunt',
  name: 'Scary Terry',
  help: "Scary Terry can't be killed: hits only shove and daze him. He follows you from room to room. Dive into a sleeper's dream (E) to shake him for a while.",
  firstAppears: 'S01E02',
  canon: true,
  create(api): MechanicInstance {
    const T = LAWNMOWER_DOG.terry;
    let met = false;
    let terry: EnemySelf | null = null;
    /** Run time when he next steps into Morty's room. */
    let arriveAt = Infinity;
    let wasHere = false;
    let region = 0;
    let dreamer: PropHandle | null = null;

    const now = () => api.now();

    function bringTerry(): void {
      const room = api.room();
      const here = api.here();
      const p = room.randomFloorPoint(api.rng, 300);
      terry = here.spawnEnemy('scary-terry', p.x, p.y, { delay: 0.6 });
      api.sfx('slash');
      api.shake(4, 160);
      // His brain says it, so the bubble sits over his head.
      if (terry) terry.memory.say = api.rng.pick([LINES.terry.back, ...LINES.terry.hunt]);
    }

    /** Dive into a sleeper's dream: Terry loses the scent for a while. */
    function dive(prop: PropHandle, room: RoomInfo): void {
      room.data.dived = true;
      prop.setInteract(null);
      prop.setVisible(false);
      dreamer = null;
      api.flash(0x7f5fd6, 220);
      api.vfx({ kind: 'burst', style: 'portal', x: api.player.x, y: api.player.y - 20, count: 24 });
      api.sfx('portal');
      if (terry?.alive) {
        api.vfx({ kind: 'burst', style: 'smoke', x: terry.x, y: terry.y - 20, count: 14 });
        api.vfx({ kind: 'text', x: terry.x, y: terry.y - 70, text: LINES.terry.lostYou, color: '#ff9f8a' });
        terry.despawn();
      }
      terry = null;
      arriveAt = now() + T.afterDive;
      api.toast('You dove into another dream. Terry lost you... for now.', { color: 0xc9b3ff, seconds: 2.4 });
    }

    function placeDreamer(room: RoomInfo): void {
      if (room.kind === 'finale' || room.kind === 'start') return;
      if (room.data.dreamer === undefined) room.data.dreamer = api.rng.chance(T.dreamerChance);
      if (!room.data.dreamer || room.data.dived) return;
      const at = room.randomFloorPoint(api.rng, 160);
      const art = DREAMERS[Math.min(DREAMERS.length - 1, room.region)];
      dreamer = api.here().addProp({ art, x: at.x, y: at.y, solid: false, interact: { label: "Dive into the sleeper's dream (shakes Terry)", fn: () => dreamer && dive(dreamer, room) } });
    }

    return {
      onActStart() {
        met = false;
        terry = null;
        arriveAt = Infinity;
        wasHere = false;
        region = 0;
      },
      onRoomEnter(room) {
        const followed = wasHere;
        terry = null;
        wasHere = false;
        dreamer = null;
        placeDreamer(room);
        const crossed = room.region !== region;
        region = room.region;
        if (room.kind === 'finale') {
          // The chase into his house is the finale's own business.
          arriveAt = Infinity;
          return;
        }
        if (!met) return;
        if (crossed) {
          // A new dream: he has to find it first.
          arriveAt = Math.max(arriveAt, now() + T.afterDive);
          api.toast('A new dream. Terry lost the scent... for now.', { color: 0xc9b3ff, seconds: 2.2 });
          return;
        }
        arriveAt = followed ? now() + T.followDelay : Math.max(arriveAt, now() + T.delay);
      },
      update() {
        if (!met || terry?.alive) {
          wasHere = !!terry?.alive;
          return;
        }
        const room = api.room();
        if (room.kind === 'finale' || room.kind === 'start') return;
        if (now() >= arriveAt) bringTerry();
      },
      onRoomClear(room) {
        // Canon: they meet him in the centaur's dream, the second dream they dive into. He steps
        // out of the dark once the room's fight is over.
        if (met || room.region < 1) return;
        met = true;
        api.here().actScene(terryArrives(), () => {
          arriveAt = now() + T.firstArrival;
          api.hint(LINES.rick.diveHint);
          api.after(6, () => api.hint(null));
        });
      },
      onActEnd() {
        terry = null;
      },
      hud() {
        if (!met) return null;
        if (terry?.alive) return { label: 'SCARY TERRY', value: 1, color: 0xff4a3d, text: "He's here", alert: true };
        const left = Math.max(0, arriveAt - now());
        if (!Number.isFinite(left)) return null;
        return { label: 'Scary Terry', value: 1 - Math.min(1, left / T.afterDive), color: 0xd96a5a, text: `${Math.ceil(left)}s`, alert: left < 3 };
      },
    };
  },
};
