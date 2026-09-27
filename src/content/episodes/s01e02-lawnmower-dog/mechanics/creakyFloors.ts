/**
 * Creaky floors (the prologue: sneaking into Goldenfold's house at night). Rooms with creaky
 * boards ('S' markers) have a Noise meter. Stepping on a board, or walking fast anywhere in the
 * room, makes noise; sneaking (Shift) is silent, and noise fades. If the meter fills, Goldenfold
 * stirs, mumbles, and Morty tiptoes back to the door to try again. It's the stealth tutorial for
 * the Jerry interlude later on.
 */
import type { MechanicDef, MechanicInstance, Vec } from '../../../../engine/types';
import { LAWNMOWER_DOG } from '../../../balance';
import { LINES } from '../dialogue';

export const creakyFloors: MechanicDef = {
  id: 'creaky-floors',
  name: 'Creaky Floors',
  help: 'Hold Shift to sneak. Walking fast or stepping on creaky boards makes noise. If the Noise meter fills, Goldenfold stirs and you have to start the room over.',
  firstAppears: 'S01E02',
  canon: false,
  create(api): MechanicInstance {
    const C = LAWNMOWER_DOG.creak;
    let noise = 0;
    let boards: Vec[] = [];
    let onBoard = new Set<number>();
    let start: Vec | null = null;
    let cooldown = 0;

    function stir(): void {
      noise = 0;
      cooldown = 2;
      api.sfx('alarm');
      api.flash(0xffd54a, 120);
      api.say('goldenfold', LINES.goldenfold.stir, 2.4);
      api.toast('Goldenfold stirs! Back to the door, quietly...', { color: 0xffd54a, seconds: 2.2 });
      if (start) api.player.setPosition(start.x, start.y);
    }

    return {
      onRoomEnter(room) {
        noise = 0;
        onBoard = new Set();
        boards = room.markers('S');
        start = { x: api.player.x, y: api.player.y };
        for (const b of boards) api.here().addProp({ art: 'creaky-board', x: b.x, y: b.y + 10, depth: -300 });
      },
      update(dt) {
        if (!boards.length) return;
        cooldown = Math.max(0, cooldown - dt);
        const p = api.player;
        if (p.moving && !p.sneaking) noise += C.walking * dt;
        else noise = Math.max(0, noise - C.decay * dt);
        boards.forEach((b, i) => {
          const on = Math.hypot(b.x - p.x, b.y - p.y) < C.radius;
          if (on && !onBoard.has(i)) {
            onBoard.add(i);
            if (!p.sneaking) {
              noise += C.board;
              api.vfx({ kind: 'text', x: b.x, y: b.y - 20, text: 'CREAK', color: '#ffe27a' });
              api.sfx('fizzle');
            }
          } else if (!on) onBoard.delete(i);
        });
        if (noise >= 100 && cooldown <= 0) stir();
      },
      onPlayerEvent(e) {
        if (!boards.length) return;
        if (e.type === 'dash') noise += C.board;
      },
      hud() {
        if (!boards.length) return null;
        return { label: 'Noise', value: Math.min(1, noise / 100), color: noise > 70 ? 0xff4a3d : noise > 40 ? 0xffa94d : 0x6fd0ff, alert: noise > 70 };
      },
    };
  },
};
