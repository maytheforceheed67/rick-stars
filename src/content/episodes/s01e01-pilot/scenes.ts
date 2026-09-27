/**
 * The Pilot's big story beats, acted out in the room: characters walk in, talk in speech bubbles
 * and react (engine/runtime/Stage.ts). Comic cutscenes (cutscenes.ts) are kept for quick recaps.
 * All lines are original.
 */
import type { RoomScriptApi, SceneStep, Vec } from '../../../engine/types';

/** In the flying car: Rick's "neutrino bomb" test, then he passes out with the bomb armed. */
export function bombReveal(rick: Vec, passOut: () => void): SceneStep[] {
  return [
    { kind: 'enter', who: 'rick', via: 'here', to: rick },
    { kind: 'face', who: 'rick', toward: { near: 'morty' } },
    { kind: 'say', who: 'rick', text: "I'm gonna drop a neutrino bomb, Morty. Wipe the slate clean. Humanity, take two." },
    { kind: 'emote', who: 'morty', emote: 'shock' },
    { kind: 'say', who: 'morty', text: "W-what?! Rick, no! You can't just blow up the whole world!" },
    { kind: 'walk', who: 'morty', to: { near: 'rick', gap: 150 } },
    { kind: 'say', who: 'morty', text: 'Land the car, Rick! Land it right now!' },
    { kind: 'emote', who: 'rick', emote: 'jump' },
    { kind: 'say', who: 'rick', text: "Ha! See? You stood up to me! It was a test, Morty. Assertiveness. You passed. Now I'm gonna..." },
    { kind: 'do', fn: passOut },
    { kind: 'leave', who: 'rick', via: 'here' },
    { kind: 'wait', seconds: 0.5 },
    { kind: 'say', who: 'morty', text: 'Rick? RICK! The bomb is still beeping!' },
  ];
}

/** Dimension 35-C: Rick steps out of the portal behind Morty, explains the place, tosses his spare gun. */
export function arrival35c(): SceneStep[] {
  return [
    { kind: 'wait', seconds: 0.7 },
    { kind: 'enter', who: 'rick', via: 'portal', to: { near: 'morty', side: 1, gap: 84 } },
    { kind: 'face', who: 'morty', toward: { near: 'rick' } },
    { kind: 'say', who: 'rick', text: 'Welcome to Dimension 35-C, Morty. Perfect conditions for Mega Trees.' },
    { kind: 'say', who: 'rick', text: "Mega Trees grow Mega Fruit. Mega Fruit hold Mega Seeds. I need the seeds. Don't ask why." },
    { kind: 'emote', who: 'morty', emote: 'jump' },
    { kind: 'say', who: 'morty', text: "Rick, I'm supposed to be in school!" },
    { kind: 'weapon' },
    { kind: 'say', who: 'rick', text: 'And those are grappling shoes. You can walk up cliffs. Just remember to turn them on.' },
    { kind: 'emote', who: 'morty', emote: 'shock' },
    { kind: 'say', who: 'morty', text: 'Turn them on how? Rick? RICK?' },
  ];
}

/** Customs: a clerk waves them through, and Rick coaches Morty on walking like a normal person. */
export function customsArrival(api: RoomScriptApi): SceneStep[] {
  const p = api.player;
  const desk = { x: p.x, y: Math.max(90, p.y - 150) };
  return [
    { kind: 'wait', seconds: 0.7 },
    { kind: 'enter', who: 'rick', via: 'portal', to: { near: 'morty', side: 1, gap: 84 } },
    { kind: 'enter', who: 'gromflomite', via: 'door', to: desk },
    { kind: 'say', who: 'gromflomite', text: 'NEXT. Anything to declare?' },
    { kind: 'say', who: 'rick', text: 'Nope. Just a man and his grandson. Declaring nothing. At all.' },
    { kind: 'say', who: 'gromflomite', text: 'Proceed to the line. The line is long. That is not my problem.' },
    { kind: 'leave', who: 'gromflomite', via: 'door' },
    { kind: 'face', who: 'rick', toward: { near: 'morty' } },
    { kind: 'say', who: 'rick', text: "Act natural, Morty. Walk slow. Don't run, don't dash, don't shoot anybody. Yet." },
    { kind: 'say', who: 'morty', text: "I'm walking really weird, Rick." },
  ];
}

/** The seeds set off the scanners. Rick stops pretending and hands over his gun (canon). */
export function coverBlown(): SceneStep[] {
  return [
    { kind: 'enter', who: 'gromflomite', via: 'door', to: { near: 'morty', side: -1, gap: 120 } },
    { kind: 'say', who: 'gromflomite', text: 'Seed contraband detected! Lock it down!' },
    { kind: 'emote', who: 'morty', emote: 'shock' },
    { kind: 'enter', who: 'rick', via: 'here', to: { near: 'morty', side: 1, gap: 84 } },
    { kind: 'say', who: 'rick', text: 'Welp. Plan B.' },
    { kind: 'say', who: 'morty', text: "Rick, I can't shoot people!" },
    { kind: 'say', who: 'rick', text: "They're robots, Morty. Totally robots. Beep boop." },
    { kind: 'weapon' },
    { kind: 'leave', who: 'gromflomite', via: 'door' },
  ];
}
