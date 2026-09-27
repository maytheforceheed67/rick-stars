/**
 * Everything said out loud during play in the Pilot: Rick's instructions and sleep-mumbling,
 * boss taunts, Goldenfold, the family and the critters. Cutscene panels keep their words in
 * cutscenes.ts. All lines are original; Rick burps mid-sentence as —*urrp*—.
 */
import type { RickLines } from '../../../engine/types';

/** One step of the neutrino-bomb puzzle: what sleeping Rick mumbles, and the right choice. */
export interface DefuseStep {
  mumble: string;
  options: string[];
  correct: number;
}

export const DEFUSE_STEPS: DefuseStep[] = [
  { mumble: "Cut the... *snore*... the wire that's the color of my portals, Morty...", options: ['Red wire', 'Green wire', 'Blue wire'], correct: 1 },
  { mumble: 'Flip the switch that is... *urrp*... NOT pointing at the ceiling.', options: ['Switch A (up)', 'Switch B (down)', 'Switch C (up)'], correct: 1 },
  { mumble: 'Press the button with the little smiley. Never the skull. Skull is bad, Morty.', options: ['Skull button', 'Smiley button'], correct: 1 },
  { mumble: "Pull the fuse with the... lowest number. It's just math, Morty... *snore*", options: ['Fuse 7', 'Fuse 3', 'Fuse 9', 'Fuse 5'], correct: 1 },
  { mumble: "Cut the one that isn't red... and isn't blue... *snore*... the other one.", options: ['Red wire', 'Blue wire', 'Yellow wire'], correct: 2 },
  { mumble: 'Turn the dial to... *urrp*... how many legs you have, Morty.', options: ['1', '2', '3', '4'], correct: 1 },
];

/** Rick's epilogue quiz. The first option is the right one; the encounter shuffles them. */
export interface QuizQuestion {
  q: string;
  options: string[];
}

export const EPILOGUE_QUESTIONS: QuizQuestion[] = [
  { q: "Morty. What's the square root of pi?", options: ['1.7724538509...', '3.1415926535...', '1.5707963267...', '2.7182818284...'] },
  {
    q: 'And the first law of thermodynamics?',
    options: ["Energy can't be created or destroyed, only change form", 'Heat always flows from cold to hot', 'Everything eventually turns into pizza', 'For every action, there is an equal and opposite Summer'],
  },
];

/** Rick walking with Morty through Dimension 35-C. */
export const RICK_ALONG_35C: RickLines = {
  enter: [
    'Look at this place. Pastel everything. Gross.',
    'Keep your eyes peeled for Mega Trees, Morty.',
    "Critters. Shoot 'em before they, uh, do whatever they do.",
    'Smells like cotton candy and —*urrp*— regret in here.',
    "Don't touch anything. Unless it's attacking you. Then touch it with lasers.",
  ],
  clear: [
    "Nice. You're a natural, Morty. Don't let it go to your head.",
    'See? Science.',
    "That's what I'm talking about, Morty!",
    'Great. Now grab the stuff. Stuff is how we win.',
  ],
  hurt: ['Walk it off, Morty!', "Dodge, Morty! It's the D in dodge!", "Ooh. That's gonna leave a mark."],
  item: ["Ooh, grab that. That's useful. Probably.", 'Pocket it, Morty. Science pocket.', 'Nice find. I was gonna take that.'],
  idle: ["We don't have all day, Morty. We have, like, half a day.", '—*urrp*—', 'Seeds, Morty. Mega Seeds. Focus.'],
};

/** Rick walking with Morty through Interdimensional Customs. */
export const RICK_ALONG_CUSTOMS: RickLines = {
  enter: [
    'Act natural, Morty. Naturally natural.',
    "Don't make eye contact with the bug guys.",
    'Bureaucracy, Morty. The real monster.',
    'Just smile and —*urrp*— nod.',
    "If anyone asks, we're here for the conference.",
  ],
  clear: ['Robots, Morty. They were robots.', 'Keep moving before they send more.', "That's the spirit. The illegal spirit."],
  hurt: ["Don't die, Morty. I'd have to fill out a form.", 'Dodge the lasers, Morty!', 'Ow. For you. Not for me.'],
  item: ['Contraband! Nice.', "Pocket it. Nobody's checking. Anymore."],
  idle: ['Every second we stand here, the line gets longer, Morty.', '—*urrp*—', 'Move it, Morty. Portal home, remember?'],
};

export const LINES = {
  rick: {
    wakeUp: 'Morty! Get up, Morty! I gotta —*urrp*— show you something!',
    /** The prologue's weapon beat: why Morty is throwing garage junk. */
    targetPractice: "Target practice, Morty! Throw stuff at the drones! Wrenches, cans, whatever's lying around!",
    /** 35-C's weapon beat: Rick tosses over his spare gun. */
    spareGun: "Here, catch! The critters here bite, Morty. Point the green end at 'em.",
    /** Customs' weapon beat, after the cover is blown (canon). */
    takeMyGun: "Here, Morty, take my gun! And shoot the robots!",
    /** Walking into the gym to deal with a dazed Frank. */
    frankChill: "Hey, Frank. Chill out. —*urrp*— Literally.",
    frankThaw: "Relax, Morty. He'll thaw. Probably. C'mon, we're leaving.",
    getInTheCar: "Great. Get in the car, Morty. We're going for a ride.",
    /** Muttered in his sleep while the bomb ticks. */
    sleeping: ['Zzz...', '*snore*', '*urrp*... zzz', 'Five more minutes, Morty... zzz'],
    defuseReset: 'Again, Morty... *snore*... again...',
    defused: 'Zzz... nice one, Morty... *snore*',
    bigTree: "That's the big one, Morty. Climb it, grab the fruit, and don't fall this time.",
    escape: "Portal's at the end of the hall, Morty! Run! Keep shooting the robots!",
    notRobots: '...Okay. Full disclosure, Morty. Not robots.',
    quizMiss: 'Close enough, Morty. The seeds are already wearing off.',
    /** The side-effects ramble that ends the episode, one line every couple of seconds. */
    ramble: [
      'See, Beth? Mega Seeds. Temporary genius. —*urrp*— Side effects include... that.',
      "Hang in there, Morty! It's fine! We're a team!",
      "Rick and Morty, Morty! Adventures! A hundred years of 'em!",
      'A hundred years, Morty! Every day! Forever and ever!',
      'Rick and... Morty... a hundred... *snore*',
    ],
  },
  morty: {
    groveSpotted: 'Whoa. A little island with something on it. Shoes on, I guess.',
    /** School's weapon beat: no guns at school. */
    gymBag: "No guns at school. Good thing my gym bag's full of dodgeballs.",
    frankFrozen: "Rick! You can't just freeze people at school!",
  },
  beth: {
    quizRight: "Morty! That's amazing!",
  },
  jerry: {
    quizRight: '...Wait. How does he know that?',
  },
  goldenfold: {
    quizStart: 'Pop quiz, Morty! Pencils out. Try not to die.',
    perfect: 'A perfect score? From Morty? I... need to sit down.',
    failed: (right: number, total: number) => `${right} out of ${total}. That's an F, Morty. See me after class.`,
  },
  frank: {
    intro: 'Hey, Smith! Did you just call me poor?!',
    phase2: "Oh, you think you're funny? Everybody watch this!",
    enraged: "That's it! You're DEAD, Smith!",
    dazed: 'Ugh... my head... so many... dodgeballs...',
    lockers: ['Locker check!', 'Hit the books, Smith!', "Here's your homework!"],
  },
  supervisor: {
    intro: 'This line is CLOSED. Permanently.',
    phase2: 'Code Red! Red tape! ALL of it!',
    phase3: 'FINAL NOTICE. Your application is REJECTED.',
    finalNotice: 'Stamp! Stamp! STAMP!',
    stuck: 'Ugh. Stamp is stuck. Nobody look.',
    summon: 'Security!',
  },
  hallMonitor: {
    whistle: 'TWEEEET!',
  },
  pepSquad: {
    cheer: ['Go, team, go!', 'Give me a W! For wedgie!', 'Spirit fingers!'],
  },
  notary: {
    approved: 'APPROVED.',
  },
  dispatcher: {
    backup: ['Backup to checkpoint four!', 'Code nine! Send everyone!', 'I need a clerk! Any clerk!'],
  },
  fruitSnatcher: {
    grabFruit: 'Mine!',
    stealScrap: 'Shiny!',
  },
};
