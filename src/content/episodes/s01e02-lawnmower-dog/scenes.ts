/**
 * The big beats of "Lawnmower Dog", acted out in the room (engine/runtime/Stage.ts): Snuffles
 * getting his helmet, the dive into Goldenfold's dream, the plane turning on them, the centaur,
 * Scary Terry, standing up for little Terry, the incept, Jerry getting caught and Snowball
 * relenting. Quick recaps stay comic panels (cutscenes.ts). All lines are original.
 */
import type { EnemySelf, RoomScriptApi, SceneStep, Vec } from '../../../engine/types';
import { LINES } from './dialogue';

const spot = (api: RoomScriptApi, ch: string, fallback: Vec): Vec => api.room.markers(ch)[0] ?? fallback;

// ---- Prologue --------------------------------------------------------------------------------------

/** The living room: the carpet, Jerry's last nerve, and Rick's intelligence helmet. */
export function helmetScene(api: RoomScriptApi): SceneStep[] {
  const c = { x: api.room.widthPx / 2, y: api.room.heightPx / 2 };
  const dog = spot(api, 'N', c);
  const jerry = spot(api, 'J', { x: c.x - 150, y: c.y - 60 });
  const rick = spot(api, 'R', { x: c.x + 150, y: c.y - 60 });
  return [
    { kind: 'enter', who: 'snuffles', via: 'here', to: dog },
    { kind: 'enter', who: 'jerry', via: 'here', to: jerry },
    { kind: 'enter', who: 'rick', via: 'here', to: rick },
    { kind: 'wait', seconds: 0.4 },
    { kind: 'emote', who: 'jerry', emote: 'shake' },
    { kind: 'say', who: 'jerry', text: LINES.jerry.peed },
    { kind: 'say', who: 'rick', text: "Fine. Anything to stop you whining, Jerry. —*urrp*— Hold still, dog." },
    { kind: 'walk', who: 'rick', to: { near: 'snuffles', side: 1, gap: 56 } },
    { kind: 'do', fn: () => api.sfx('charge-shot') },
    { kind: 'pose', who: 'snuffles', art: 'snuffles-helmet' },
    { kind: 'emote', who: 'snuffles', emote: 'jump' },
    { kind: 'say', who: 'rick', text: LINES.rick.helmetDone },
    { kind: 'say', who: 'snuffles', text: 'Woof.' },
    { kind: 'say', who: 'jerry', text: LINES.jerry.goodBoy },
    { kind: 'face', who: 'rick', toward: { near: 'morty' } },
    { kind: 'say', who: 'rick', text: LINES.rick.toGoldenfold },
    { kind: 'emote', who: 'morty', emote: 'shock' },
    { kind: 'say', who: 'morty', text: LINES.morty.homework },
    { kind: 'say', who: 'rick', text: 'You want to keep going on adventures or not? Garage. Now.' },
    { kind: 'leave', who: 'rick', via: 'door' },
  ];
}

/** Goldenfold's bedroom: the dream inceptor goes on, Rick lays down the one rule, and in they go. */
export function inceptorScene(device: Vec, onPlaced: () => void): SceneStep[] {
  return [
    { kind: 'walk', who: 'rick', to: { x: device.x + 40, y: device.y } },
    { kind: 'say', who: 'rick', text: LINES.rick.inceptorSetup },
    { kind: 'do', fn: onPlaced },
    { kind: 'face', who: 'rick', toward: { near: 'morty' } },
    { kind: 'say', who: 'rick', text: LINES.rick.dieForReal },
    { kind: 'say', who: 'morty', text: 'Wait, WHAT? Rick, that is a really important rule!' },
    { kind: 'say', who: 'rick', text: "It's the only rule. Dive in 3, 2..." },
  ];
}

// ---- Act 1: Goldenfold's dream ---------------------------------------------------------------------

/** On the plane: Rick explains dream gear, and Morty imagines his first weapon. */
export function planeOpening(): SceneStep[] {
  return [
    { kind: 'wait', seconds: 0.7 },
    { kind: 'enter', who: 'rick', via: 'here', to: { near: 'morty', side: 1, gap: 84 } },
    { kind: 'say', who: 'rick', text: "We're in. Goldenfold's dream. He's on a plane, because of course he is." },
    { kind: 'say', who: 'morty', text: "Rick, I don't have anything to fight with!" },
    { kind: 'say', who: 'rick', text: LINES.rick.imagineGear },
    { kind: 'emote', who: 'morty', emote: 'shake' },
    { kind: 'weapon' },
    { kind: 'say', who: 'rick', text: "Good. Now find Goldenfold and scare him into an A." },
  ];
}

/** Dream Goldenfold beaten: he turns the dream on them and they fall toward lava. */
export function goldenfoldTurnsIt(api: RoomScriptApi, boss: EnemySelf): SceneStep[] {
  const at = { x: boss.x, y: boss.y };
  return [
    { kind: 'say', who: 'goldenfold', text: LINES.goldenfold.turnsIt, seconds: 2.4 },
    {
      kind: 'do',
      fn: () => {
        api.shake(12, 700);
        api.flash(0xff5a1f, 240);
        api.tilt(0.12, 2.2);
        api.sfx('crumble');
        for (let i = 0; i < 6; i++) api.vfx({ kind: 'burst', style: 'fire', x: at.x + (i - 3) * 90, y: at.y + 120, count: 10 });
      },
    },
    { kind: 'enter', who: 'rick', via: 'here', to: { near: 'morty', side: 1, gap: 84 } },
    { kind: 'say', who: 'rick', text: LINES.rick.lava },
    { kind: 'say', who: 'morty', text: "I don't know! His ex-wife? The weather lady?" },
    { kind: 'say', who: 'rick', text: LINES.rick.pancakes },
  ];
}

// ---- Act 2: dreams within dreams -------------------------------------------------------------------

/** Outside Mrs. Pancakes' dream club: the velvet rope, and a centaur who does not like them. */
export function clubOpening(api: RoomScriptApi): SceneStep[] {
  const door = spot(api, 'Y', { x: api.room.widthPx / 3, y: 140 });
  return [
    {
      kind: 'do',
      fn: () => {
        // The club itself stays off-screen: just its door, the rope, and the bouncer.
        api.addProp({ art: 'club-door', x: door.x, y: door.y - 30, depth: -200, persist: true });
        api.addProp({ art: 'velvet-rope', x: door.x, y: door.y + 44, persist: true });
      },
    },
    { kind: 'wait', seconds: 0.6 },
    { kind: 'enter', who: 'rick', via: 'here', to: { near: 'morty', side: 1, gap: 84 } },
    { kind: 'enter', who: 'centaur', via: 'here', to: { x: door.x + 90, y: door.y + 70 } },
    { kind: 'say', who: 'centaur', text: LINES.centaur.stop },
    { kind: 'say', who: 'rick', text: "We're with Goldenfold. Friends of the dreamer. VIPs, basically." },
    { kind: 'say', who: 'centaur', text: LINES.centaur.notOnList },
    { kind: 'say', who: 'morty', text: LINES.morty.tooYoung },
    { kind: 'say', who: 'centaur', text: LINES.centaur.threat },
    { kind: 'face', who: 'rick', toward: { near: 'morty' } },
    { kind: 'say', who: 'rick', text: LINES.rick.clubPlan },
    { kind: 'say', who: 'morty', text: 'Deeper dream, weirder stuff, right? Okay...' },
    { kind: 'weapon' },
  ];
}

/** In the centaur's dream, a lanky man in a brown hat steps out of the dark. */
export function terryArrives(): SceneStep[] {
  return [
    { kind: 'enter', who: 'scary-terry', via: 'here', to: { near: 'morty', side: -1, gap: 170 } },
    { kind: 'emote', who: 'morty', emote: 'shock' },
    { kind: 'say', who: 'scary-terry', text: LINES.terry.intro },
    { kind: 'say', who: 'morty', text: LINES.morty.terryWhy },
    { kind: 'say', who: 'rick', text: LINES.rick.terryFirst },
    { kind: 'leave', who: 'scary-terry', via: 'here' },
  ];
}

/** The end of the chase: Terry yawns, goes to bed, and they dive into his dream. */
export function terryFallsAsleep(bed: Vec, onAsleep: () => void): SceneStep[] {
  return [
    { kind: 'enter', who: 'scary-terry', via: 'door', to: { x: bed.x - 60, y: bed.y + 50 } },
    { kind: 'say', who: 'scary-terry', text: LINES.terry.tired },
    { kind: 'leave', who: 'scary-terry', via: 'here' },
    { kind: 'do', fn: onAsleep },
    { kind: 'wait', seconds: 0.6 },
    { kind: 'enter', who: 'rick', via: 'here', to: { near: 'morty', side: 1, gap: 84 } },
    { kind: 'say', who: 'rick', text: LINES.rick.terryAsleep },
  ];
}

// ---- Act 3: Terry's dream --------------------------------------------------------------------------

/** Terry's school: the kids laughing at a little boy with no pants. Morty sticks up for him. */
export function terrySchoolOpening(): SceneStep[] {
  return [
    { kind: 'wait', seconds: 0.6 },
    { kind: 'enter', who: 'rick', via: 'here', to: { near: 'morty', side: 1, gap: 84 } },
    { kind: 'enter', who: 'little-terry', via: 'door', to: { near: 'morty', side: -1, gap: 150 } },
    { kind: 'say', who: 'little-terry', text: LINES.littleTerry.sad[1] },
    { kind: 'say', who: 'rick', text: LINES.rick.helpTheKid },
    { kind: 'walk', who: 'morty', to: { near: 'little-terry', gap: 70 } },
    { kind: 'say', who: 'morty', text: LINES.morty.standUp },
    { kind: 'say', who: 'little-terry', text: LINES.littleTerry.thanks[1] },
    { kind: 'say', who: 'rick', text: LINES.rick.weirderGear },
    { kind: 'weapon' },
    { kind: 'leave', who: 'little-terry', via: 'door' },
  ];
}

/** Back in Goldenfold's dream, with a new friend: the incept. */
export function inceptScene(api: RoomScriptApi): SceneStep[] {
  const c = { x: api.room.widthPx / 2, y: api.room.heightPx / 2 - 60 };
  return [
    { kind: 'enter', who: 'goldenfold', via: 'portal', to: c },
    { kind: 'enter', who: 'scary-terry', via: 'here', to: { near: 'goldenfold', side: 1, gap: 90 } },
    { kind: 'enter', who: 'rick', via: 'here', to: { near: 'morty', side: 1, gap: 84 } },
    { kind: 'emote', who: 'goldenfold', emote: 'shock' },
    { kind: 'say', who: 'scary-terry', text: LINES.terry.incept },
    { kind: 'emote', who: 'goldenfold', emote: 'shake' },
    { kind: 'say', who: 'goldenfold', text: LINES.goldenfold.incepted },
    { kind: 'say', who: 'rick', text: LINES.rick.incept },
    { kind: 'say', who: 'morty', text: 'Thanks, Terry!' },
    { kind: 'say', who: 'scary-terry', text: LINES.terry.bye },
    { kind: 'leave', who: 'scary-terry', via: 'here' },
    { kind: 'leave', who: 'goldenfold', via: 'portal' },
  ];
}

// ---- Interludes ------------------------------------------------------------------------------------

/** Jerry vs. Snuffles, final round: the TV special, and a dog with opinions. */
export function snufflesWins(dog: Vec, tv: Vec): SceneStep[] {
  return [
    { kind: 'enter', who: 'snuffles', via: 'here', to: dog },
    { kind: 'pose', who: 'snuffles', art: 'snuffles-arm' },
    { kind: 'walk', who: 'snuffles', to: { x: tv.x, y: tv.y + 80 } },
    { kind: 'face', who: 'snuffles', toward: tv },
    { kind: 'wait', seconds: 0.8 },
    { kind: 'say', who: 'snuffles', text: LINES.snuffles.tv },
    { kind: 'face', who: 'snuffles', toward: { near: 'jerry' } },
    { kind: 'say', who: 'jerry', text: LINES.jerry.lost },
    { kind: 'say', who: 'snuffles', text: LINES.snuffles.notGoodBoy },
    { kind: 'emote', who: 'jerry', emote: 'shock' },
    { kind: 'leave', who: 'snuffles', via: 'door' },
  ];
}

/** The dog patrols have Jerry surrounded. */
export function jerryCaught(): SceneStep[] {
  return [
    { kind: 'enter', who: 'dog-trooper', via: 'door', to: { near: 'jerry', side: 1, gap: 90 } },
    { kind: 'say', who: 'dog-trooper', text: LINES.dogs.caught },
    { kind: 'emote', who: 'jerry', emote: 'shock' },
    { kind: 'say', who: 'jerry', text: LINES.jerry.caught },
    { kind: 'say', who: 'dog-trooper', text: 'Bad human. Kennel. NOW.' },
  ];
}

// ---- Epilogue: Snowball ----------------------------------------------------------------------------

/** Morty's luxury suite in Snowball's world, and Rick with a smuggled tennis ball launcher. */
export function luxuryOpening(api: RoomScriptApi): SceneStep[] {
  const w = spot(api, 'W', { x: api.room.widthPx / 2 + 150, y: api.room.heightPx / 2 });
  return [
    { kind: 'enter', who: 'snowball', via: 'here', to: w },
    { kind: 'say', who: 'snowball', text: LINES.snowball.luxury },
    { kind: 'say', who: 'morty', text: LINES.morty.snowballLuxury },
    { kind: 'leave', who: 'snowball', via: 'door' },
    { kind: 'enter', who: 'rick', via: 'door', to: { near: 'morty', side: 1, gap: 84 } },
    { kind: 'say', who: 'rick', text: "Morty. It's been a year. Or it feels like one. We're ending this." },
    { kind: 'weapon' },
    { kind: 'say', who: 'rick', text: 'Get to Snowball. Trust me.' },
  ];
}

/** The canon twist: it's Snowball's dream, he sees Morty suffer, and he relents. */
export function snowballRelents(_api: RoomScriptApi, boss: EnemySelf): SceneStep[] {
  const at = { x: boss.x, y: boss.y };
  return [
    // The war suit powers down; Snowball himself steps out of it.
    { kind: 'do', fn: () => boss.setAlpha(0.25) },
    { kind: 'enter', who: 'snowball', via: 'here', to: { x: at.x, y: at.y + 40 } },
    { kind: 'enter', who: 'rick', via: 'door', to: { near: 'morty', side: 1, gap: 84 } },
    { kind: 'say', who: 'rick', text: LINES.rick.snowballDream },
    { kind: 'say', who: 'snowball', text: 'My... dream?' },
    { kind: 'say', who: 'rick', text: LINES.rick.mortySick },
    { kind: 'emote', who: 'morty', emote: 'shake' },
    { kind: 'say', who: 'morty', text: LINES.morty.sick },
    { kind: 'say', who: 'snowball', text: LINES.snowball.relents },
    { kind: 'say', who: 'snowball', text: LINES.snowball.leave },
    { kind: 'say', who: 'snowball', text: LINES.snowball.goodbye },
    { kind: 'leave', who: 'snowball', via: 'portal' },
  ];
}
