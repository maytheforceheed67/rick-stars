/**
 * Everything said out loud during play in the Pilot: Rick's instructions and sleep-mumbling,
 * boss taunts, Goldenfold, the family and the critters. Cutscene panels keep their words in
 * cutscenes.ts. All lines are original; Rick burps mid-sentence as —*urrp*—.
 */

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

export const LINES = {
  rick: {
    wakeUp: 'Morty! Get up, Morty! I gotta —*urrp*— show you something!',
    targetPractice: "Target practice, Morty! Shoot the junk drones. Don't ask why they fly.",
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
