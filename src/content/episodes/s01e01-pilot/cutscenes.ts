/**
 * Comic-panel cutscenes for the Pilot. All dialogue is original, written in the characters'
 * voices; the beats follow the episode.
 */
import type { CutsceneDef, CutscenePanel } from '../../../engine/types';

const cs = (id: string, panels: CutscenePanel[], title?: string): CutsceneDef => ({ id, title, firstAppears: 'S01E01', canon: true, panels });

export const PILOT_CUTSCENES: CutsceneDef[] = [
  cs('pilot-wake-up', [
    { backdrop: 'night-town', text: 'The middle of the night. The Smith house.', caption: true },
    { backdrop: 'bedroom-night', speaker: 'rick', expression: 'drunk', text: 'Morty. Morty! Wake up, Morty. I got a —*urrp*— surprise for you.' },
    { backdrop: 'bedroom-night', speaker: 'morty', expression: 'sleepy', text: "Rick? It's, like, three in the morning..." },
    { backdrop: 'bedroom-night', speaker: 'rick', expression: 'drunk', text: 'Garage, Morty. Now. It\'s important. Or it isn\'t. Come find out!' },
  ], 'Just a Test'),
  cs('pilot-breakfast', [
    { backdrop: 'kitchen', text: 'The next morning.', caption: true },
    { backdrop: 'kitchen', speaker: 'jerry', expression: 'angry', cast: ['beth'], text: 'Your father keeps Morty out all night, Beth. He\'s failing math!' },
    { backdrop: 'kitchen', speaker: 'rick', expression: 'normal', text: "School's a waste of time. Anyway, Beth, this breakfast? Incredible. You're a great cook." },
    { backdrop: 'kitchen', speaker: 'beth', expression: 'happy', text: '...Aw. Thanks, Dad.' },
    { backdrop: 'kitchen', speaker: 'jerry', expression: 'angry', text: 'Unbelievable.' },
  ]),
  cs('pilot-school-intro', [
    { backdrop: 'classroom', text: "Harry Herpson High. Mr. Goldenfold's math class.", caption: true },
    { backdrop: 'classroom', speaker: 'goldenfold', expression: 'normal', text: 'Pencils down. Test time. ...Morty? Morty, are you asleep?' },
    { backdrop: 'classroom', speaker: 'morty', expression: 'sleepy', text: "Huh? I'm up! I'm... mostly up." },
    { backdrop: 'classroom', text: 'Morty is Sleep-Deprived: slower shots for the first few rooms.', caption: true },
  ], 'Act 1'),
  cs('pilot-frank-shatter', [
    { backdrop: 'hallway', text: 'Later, in the hallway...', caption: true },
    { backdrop: 'hallway', speaker: 'summer', expression: 'happy', text: 'Hey, Frank. I like your... frozen... look. Very chill.' },
    { backdrop: 'hallway', text: '*crack*', caption: true, sfx: 'shatter' },
    { backdrop: 'hallway', speaker: 'summer', expression: 'scared', text: 'AAAAAAAH!' },
  ]),
  cs('pilot-principal', [
    { backdrop: 'principal-office', text: "Meanwhile, in the principal's office...", caption: true },
    { backdrop: 'principal-office', speaker: 'principal-vagina', expression: 'normal', text: 'Morty has been in school for about seven hours. Total. In two months.' },
    { backdrop: 'principal-office', speaker: 'jerry', expression: 'angry', text: 'SEVEN HOURS?!' },
    { backdrop: 'principal-office', speaker: 'beth', expression: 'sad', text: "Okay. That's it. Dad's going to a nursing home." },
  ]),
  cs('pilot-serum', [
    { backdrop: 'cliff-35c', text: 'Morty did not turn on his shoes.', caption: true },
    { backdrop: 'cliff-35c', speaker: 'morty', expression: 'scared', text: 'AAAH! My legs! Rick, my legs are broken!' },
    { backdrop: 'cliff-35c', speaker: 'rick', expression: 'angry', text: 'You had ONE job, Morty. Turn on the shoes.' },
    { backdrop: 'cliff-35c', speaker: 'rick', expression: 'normal', text: 'Hang on. I know a future where every drugstore sells Broken Leg Serum.' },
    { backdrop: 'drugstore', text: 'One quick portal trip later...', caption: true, sfx: 'portal' },
    { backdrop: 'cliff-35c', speaker: 'rick', expression: 'normal', text: 'One shot, good as new. That trip drained the portal gun, by the way. Press F this time, genius.' },
  ]),
  cs('pilot-35c-outro', [
    { backdrop: 'hills-35c', speaker: 'rick', expression: 'happy', text: 'Mega Seeds, Morty! We got \'em! Only one problem.' },
    { backdrop: 'hills-35c', speaker: 'rick', expression: 'normal', text: "Portal gun's empty. We're going home the long way: Interdimensional Customs." },
    { backdrop: 'hills-35c', speaker: 'rick', expression: 'normal', text: "And they're real strict about Mega Seeds. You're gonna have to hide them. Somewhere they won't look." },
    { backdrop: 'hills-35c', speaker: 'morty', expression: 'scared', text: 'Where?' },
    { backdrop: 'hills-35c', speaker: 'rick', expression: 'normal', text: 'You know where, Morty.' },
    { backdrop: 'hills-35c', speaker: 'morty', expression: 'sick', text: 'Aw geez.' },
  ]),
  cs('pilot-customs-outro', [
    { backdrop: 'portal', text: 'Through the portal. Home.', caption: true, sfx: 'portal' },
    { backdrop: 'living-room', speaker: 'morty', expression: 'angry', text: 'Rick! Those were NOT robots! They had families, Rick!' },
    { backdrop: 'living-room', speaker: 'rick', expression: 'normal', text: 'Morty, you gotta —*urrp*— learn to let things go. And gimme my gun back.' },
  ]),
  cs('pilot-epilogue-packing', [
    { backdrop: 'living-room', text: 'Meanwhile, at home...', caption: true },
    { backdrop: 'living-room', speaker: 'jerry', expression: 'normal', text: "Box twelve: Rick's weird garage stuff. Into the nursing home van it goes." },
    { backdrop: 'living-room', speaker: 'beth', expression: 'sad', text: "It's for the best, Jerry. He can't keep pulling Morty out of school." },
    { backdrop: 'living-room', speaker: 'rick', expression: 'angry', text: "Hey! Put that down! Morty's getting SMARTER with me. Watch this." },
  ], 'Epilogue'),
];
