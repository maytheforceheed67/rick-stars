/**
 * Grappling Shoes (Dimension 35-C). F toggles them. While on, Morty can walk on cliff faces but
 * the battery drains; it recharges while off (or on a battery pad). Stepping onto a cliff with
 * them off means a fall and Broken Legs. The very first fall is the canon beat: Rick fetches
 * Broken Leg Serum from a future drugstore, which is what empties the portal gun.
 */
import type { MechanicDef, MechanicInstance } from '../../../../engine/types';
import { PILOT } from '../../../balance';

export const grapplingShoes: MechanicDef = {
  id: 'grappling-shoes',
  name: 'Grappling Shoes',
  help: 'F turns the shoes on or off. On: walk on cliffs (the battery drains). Off: it recharges. Battery pads recharge faster.',
  firstAppears: 'S01E01',
  canon: true,
  create(api): MechanicInstance {
    let on = false;
    let battery = 100;
    let locked = true;
    let warned = false;
    const max = () => 100 * (api.stats().shoeBattery ?? 1);
    const onPad = () => api.room().markers('B').some((p) => Math.hypot(p.x - api.player.x, p.y - api.player.y) < 34);

    const turnOff = (why?: string) => {
      on = false;
      if (why) {
        api.toast(why, { color: 0xff8a3d, seconds: 2 });
        api.sfx('fizzle');
      }
    };

    return {
      onActStart() {
        on = false;
        battery = max();
        locked = !api.flags.serumDone;
        if (!api.hasItem('grappling-shoes')) api.giveItem('grappling-shoes', { silent: true });
      },
      onRoomEnter(room) {
        if (room.kind === 'start' && !api.flags.serumDone && room.firstVisit) {
          api.hint('Rick said to turn the shoes on. He did not say how. Walk off the plateau, Morty.');
        }
      },
      update(dt) {
        if (on) {
          if (onPad()) battery = Math.min(max(), battery + PILOT.shoes.padRecharge * dt);
          else battery -= PILOT.shoes.drain * dt;
          if (battery <= 0) {
            battery = 0;
            turnOff('Shoe battery dead!');
          } else if (battery < 25 && !warned) {
            warned = true;
            api.sfx('laser-warn');
          }
        } else {
          battery = Math.min(max(), battery + PILOT.shoes.recharge * dt);
        }
        if (battery > 30) warned = false;
      },
      onAction() {
        if (locked) {
          api.toast("You can't find the switch. (Rick never explained.)", { seconds: 2 });
          api.sfx('ui-deny');
          return;
        }
        if (!on && battery < 5) {
          api.toast('Battery too low. Let it recharge.', { seconds: 1.6 });
          api.sfx('ui-deny');
          return;
        }
        on = !on;
        api.sfx(on ? 'portal' : 'ui-back');
        api.hint(null);
      },
      allowsTile(tile) {
        return tile === 'cliff' && on && battery > 0 ? true : undefined;
      },
      onFall() {
        if (!api.flags.serumDone) {
          // The scripted canon beat.
          api.applyStatus('broken-legs');
          api.hint(null);
          api.playCutscene('pilot-serum', () => {
            api.flags.serumDone = true;
            api.flags.portalGun = 'empty';
            api.removeStatus('broken-legs');
            locked = false;
            battery = max();
            api.toast('Broken Leg Serum: legs fixed. Portal gun: empty.', { color: 0x97ce4c, seconds: 3 });
            api.hint('Press F to turn your Grappling Shoes ON, then cross the cliff.');
            api.after(9, () => api.hint(null));
          });
          return true;
        }
        api.player.damage(1, 'a cliff in Dimension 35-C', { ignoreInvulnerability: true });
        api.applyStatus('broken-legs');
        return true;
      },
      hud() {
        return {
          label: locked ? 'Grappling Shoes: ???' : `Grappling Shoes: ${on ? 'ON' : 'OFF'}  [F]`,
          value: battery / max(),
          color: on ? 0x97ce4c : 0x7fa8b8,
          alert: on && battery < 25,
        };
      },
    };
  },
};
