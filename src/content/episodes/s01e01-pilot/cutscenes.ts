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
  cs('pilot-flight', [
    { backdrop: 'car-night', text: "Rick's flying car. Built from garage junk. Airborne. Somehow.", caption: true, sfx: 'portal' },
    { backdrop: 'car-night', speaker: 'rick', expression: 'drunk', text: "I'm gonna drop a neutrino bomb, Morty. Wipe the slate clean. Start humanity over from scratch." },
    { backdrop: 'car-night', speaker: 'morty', expression: 'scared', text: "W-what?! Rick, no! You can't just blow up the whole world!" },
    { backdrop: 'car-night', speaker: 'morty', expression: 'angry', text: 'Land the car, Rick! Land it right now!' },
    { backdrop: 'car-night', speaker: 'rick', expression: 'happy', text: 'Ha! See? You stood up to me! It was a test, Morty. Assertiveness. You passed. Now I\'m gonna... *snore*' },
    { backdrop: 'car-night', text: 'Rick passes out. The neutrino bomb is still armed.', caption: true, sfx: 'snore' },
  ]),
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
  cs('pilot-frank-frozen', [
    { backdrop: 'hallway', speaker: 'frank', expression: 'angry', text: 'You... you called me poor! Nobody calls me poor, Smith!' },
    { backdrop: 'hallway', speaker: 'morty', expression: 'scared', text: "I didn't! I-I didn't say anything!" },
    { backdrop: 'hallway', text: 'ZZZZAP.', caption: true, sfx: 'freeze-ray' },
    { backdrop: 'hallway', speaker: 'rick', expression: 'normal', text: "Relax, Morty. Freeze ray. He'll thaw. Probably. —*urrp*— C'mon, we're leaving." },
    { backdrop: 'hallway', speaker: 'morty', expression: 'angry', text: "Rick! You can't just freeze people at school!" },
  ]),
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
  cs('pilot-35c-arrival', [
    { backdrop: 'hills-35c', text: 'Dimension 35-C.', caption: true, sfx: 'portal' },
    { backdrop: 'hills-35c', speaker: 'rick', expression: 'normal', text: 'Welcome to Dimension 35-C, Morty. Perfect conditions for Mega Trees.' },
    { backdrop: 'hills-35c', speaker: 'rick', expression: 'normal', text: 'Mega Trees grow Mega Fruit. Mega Fruit hold Mega Seeds. I need the seeds for my research. Don\'t ask.' },
    { backdrop: 'hills-35c', speaker: 'morty', expression: 'angry', text: "Rick, I'm supposed to be in school!" },
    { backdrop: 'hills-35c', speaker: 'rick', expression: 'normal', text: 'Here. Grappling shoes. You can walk on cliffs. Just remember to turn them on.' },
    { backdrop: 'hills-35c', speaker: 'morty', expression: 'scared', text: 'Turn them on how? Rick? RICK?' },
  ], 'Act 2'),
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
  cs('pilot-customs-intro', [
    { backdrop: 'customs', text: 'Interdimensional Customs. The longest line in the multiverse.', caption: true },
    { backdrop: 'customs', speaker: 'gromflomite', expression: 'normal', text: 'NEXT. Anything to declare?' },
    { backdrop: 'customs', speaker: 'rick', expression: 'normal', text: "Act natural, Morty. Walk slow. Don't run, don't dash, don't shoot anybody. Yet." },
    { backdrop: 'customs', speaker: 'morty', expression: 'sick', text: "I'm walking really weird, Rick." },
  ], 'Act 3'),
  cs('pilot-cover-blown', [
    { backdrop: 'customs', text: 'BEEP. BEEP. BEEP.', caption: true, sfx: 'alarm' },
    { backdrop: 'customs', speaker: 'gromflomite', expression: 'angry', text: 'Seed contraband detected! Lock it down!' },
    { backdrop: 'customs', speaker: 'rick', expression: 'normal', text: 'Welp. Plan B. Here, Morty, take my ray gun.' },
    { backdrop: 'customs', speaker: 'morty', expression: 'scared', text: "Rick, I can't shoot people!" },
    { backdrop: 'customs', speaker: 'rick', expression: 'normal', text: "They're robots, Morty. Totally robots. Shoot the robots." },
  ]),
  cs('pilot-customs-outro', [
    { backdrop: 'portal', text: 'Through the portal. Home.', caption: true, sfx: 'portal' },
    { backdrop: 'living-room', speaker: 'morty', expression: 'angry', text: 'Rick! Those were NOT robots! They had families, Rick!' },
    { backdrop: 'living-room', speaker: 'rick', expression: 'normal', text: 'Morty, you gotta —*urrp*— learn to let things go.' },
  ]),
  cs('pilot-epilogue-packing', [
    { backdrop: 'living-room', text: 'Meanwhile, at home...', caption: true },
    { backdrop: 'living-room', speaker: 'jerry', expression: 'normal', text: "Box twelve: Rick's weird garage stuff. Into the nursing home van it goes." },
    { backdrop: 'living-room', speaker: 'beth', expression: 'sad', text: "It's for the best, Jerry. He can't keep pulling Morty out of school." },
    { backdrop: 'living-room', speaker: 'rick', expression: 'angry', text: "Hey! Put that down! Morty's getting SMARTER with me. Watch this." },
  ], 'Epilogue'),
];
