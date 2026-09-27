/**
 * Dream control (Act 1, Goldenfold's dream). It's his dream, and he knows something's wrong:
 * every few seconds of a fight the dream shifts. The cabin banks and everything slides, a row of
 * seats slams across the aisle, or he dreams up machine guns. The HUD meter shows the next shift
 * coming.
 */
import type { MechanicDef, MechanicInstance } from '../../../../engine/types';
import { LAWNMOWER_DOG } from '../../../balance';
import { LINES } from '../dialogue';

type Shift = 'tilt' | 'seats' | 'guns';

export const dreamControl: MechanicDef = {
  id: 'dream-control',
  name: 'Dream Control',
  help: "It's Goldenfold's dream: during fights it shifts. The cabin tilts (you slide), seats slam across the aisle, and machine guns appear. Watch the meter.",
  firstAppears: 'S01E02',
  canon: true,
  create(api): MechanicInstance {
    const D = LAWNMOWER_DOG.dreamControl;
    let next = 0;
    let max = 1;
    let tiltLeft = 0;
    let tiltDir = 1;
    let last: Shift | null = null;

    const reset = () => {
      max = api.rng.float(D.every[0], D.every[1]);
      next = max;
    };
    const fighting = () => {
      const room = api.room();
      return room.kind === 'combat' && !room.cleared && api.here().enemyCount() > 0;
    };

    function shift(): void {
      const options: Shift[] = (['tilt', 'seats', 'guns'] as Shift[]).filter((s) => s !== last);
      const s = api.rng.pick(options);
      last = s;
      const room = api.room();
      const here = api.here();
      api.say('goldenfold', api.rng.pick(LINES.goldenfold.control), 1.8);
      if (s === 'tilt') {
        tiltDir = api.rng.chance(0.5) ? 1 : -1;
        tiltLeft = D.tiltSeconds;
        api.tilt(tiltDir * D.tiltAngle, D.tiltSeconds);
        api.toast('The cabin tilts!', { color: 0xc58bff, seconds: 1.4 });
        api.sfx('crumble');
      } else if (s === 'seats') {
        const fromLeft = api.player.x > room.widthPx / 2;
        const y = Math.max(110, Math.min(room.heightPx - 110, api.player.y));
        here.spawnEnemy('sliding-seats', fromLeft ? 80 : room.widthPx - 80, y);
        api.toast('Seats sliding!', { color: 0xc58bff, seconds: 1.2 });
      } else {
        for (let i = 0; i < D.guns; i++) {
          const p = room.randomFloorPoint(api.rng, 220);
          here.spawnEnemy('dream-machine-gun', p.x, p.y, { delay: 0.8 });
        }
        api.say('goldenfold', LINES.goldenfold.guns, 1.8);
      }
    }

    return {
      onActStart() {
        reset();
        tiltLeft = 0;
        last = null;
      },
      onRoomEnter() {
        reset();
        tiltLeft = 0;
      },
      update(dt) {
        if (tiltLeft > 0) {
          tiltLeft -= dt;
          // Morty slides toward the low side of the cabin at about tiltPush px/s (knockback
          // decays at 10/s, so a steady push is speed * 10 * dt per frame).
          api.player.knockback(tiltDir > 0 ? 0 : Math.PI, D.tiltPush * 10 * dt);
        }
        if (!fighting()) return;
        next -= dt;
        if (next <= 0) {
          shift();
          reset();
        }
      },
      hud() {
        if (!fighting()) return null;
        return { label: 'Dream shift', value: 1 - next / max, color: 0xc58bff, alert: next < 1.5 };
      },
    };
  },
};
