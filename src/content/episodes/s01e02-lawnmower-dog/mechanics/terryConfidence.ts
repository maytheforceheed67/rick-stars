/**
 * Little Terry's confidence (Act 3, Terry's dream). In his dream Terry is a kid at school,
 * mocked for failing a pop quiz and forgetting his pants. He sits in the middle of each fight;
 * the kids near him mock him and his confidence drops. Clearing a room lifts it, and so does
 * helping with his pop quiz (the special room adds to flags.terryConfidence). Win him over and
 * he passes some courage back before the climb.
 */
import type { MechanicDef, MechanicInstance, PropHandle, Vec } from '../../../../engine/types';
import { LAWNMOWER_DOG } from '../../../balance';
import { LINES } from '../dialogue';

/** Enemies that pick on Terry. */
const MOCKERS = new Set(['mocking-kid', 'dodgeball-jock', 'pep-squad', 'laughing-mouth']);

export const terryConfidence: MechanicDef = {
  id: 'terry-confidence',
  name: "Terry's Confidence",
  help: "Little Terry sits in each fight. Kids near him mock him and his confidence drops; clearing rooms and helping with his quiz lifts it. Win him over.",
  firstAppears: 'S01E02',
  canon: true,
  create(api): MechanicInstance {
    const C = LAWNMOWER_DOG.confidence;
    let terry: PropHandle | null = null;
    let at: Vec | null = null;
    let mockTimer = 0;
    let pepTalked = false;

    const value = () => (api.flags.terryConfidence as number | undefined) ?? C.start;
    const change = (by: number) => {
      api.flags.terryConfidence = Math.max(0, Math.min(100, value() + by));
    };

    return {
      onActStart() {
        api.flags.terryConfidence = C.start;
        pepTalked = false;
      },
      onRoomEnter(room) {
        terry = null;
        at = null;
        mockTimer = C.mockEvery;
        if (room.kind !== 'combat' || room.cleared) return;
        const center = { x: room.widthPx / 2, y: room.heightPx / 2 };
        const spot = room.markers('T')[0] ?? (room.tileAt(center.x, center.y) === 'floor' ? center : room.randomFloorPoint(api.rng, 160));
        at = spot;
        terry = api.here().addProp({ art: 'little-terry', x: spot.x, y: spot.y + 20, actor: 'little-terry' });
        if (room.firstVisit) api.after(1.2, () => api.say('little-terry', api.rng.pick(LINES.littleTerry.sad), 2.2));
      },
      update(dt) {
        if (!terry || !at) return;
        mockTimer -= dt;
        if (mockTimer > 0) return;
        mockTimer = C.mockEvery;
        const mockers = api.enemies().filter((e) => MOCKERS.has(e.def.id) && Math.hypot(e.x - at!.x, e.y - at!.y) < C.mockRadius);
        if (!mockers.length) return;
        const m = api.rng.pick(mockers);
        api.vfx({ kind: 'text', x: m.x, y: m.y - 44, text: api.rng.pick(LINES.kids.mock), color: '#ff9fc8' });
        change(-C.mockHit);
        terry.pulse();
        if (api.rng.chance(0.4)) api.say('little-terry', api.rng.pick(LINES.littleTerry.sad), 1.8);
      },
      onRoomClear(room) {
        if (!terry || room.kind !== 'combat') return;
        change(C.perRoom);
        api.say('little-terry', api.rng.pick(LINES.littleTerry.thanks), 2.2);
        api.vfx({ kind: 'burst', style: 'heal', x: at!.x, y: at!.y - 20, count: 10 });
        if (!pepTalked && value() >= C.pepTalkAt) {
          pepTalked = true;
          api.after(2.4, () => {
            api.say('little-terry', LINES.littleTerry.pepTalk, 3);
            api.applyStatus('dream-courage');
            api.toast("Terry believes in you: +25% damage for the rest of the act!", { color: 0xd96a5a, seconds: 3 });
          });
        }
      },
      hud() {
        const v = value();
        return { label: "Terry's Confidence", value: v / 100, color: v >= C.pepTalkAt ? 0x97ce4c : v >= 40 ? 0xf2c14e : 0xd96a5a, text: `${Math.round(v)}%` };
      },
    };
  },
};
