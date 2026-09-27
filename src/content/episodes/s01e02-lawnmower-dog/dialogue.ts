/**
 * Everything said out loud during play in "Lawnmower Dog": Rick's running commentary, the dream
 * people, Scary Terry's (censored) catchphrase, Snuffles getting smarter and Jerry losing. All
 * lines are original; Rick burps mid-sentence as —*urrp*—.
 */
import type { RickLines } from '../../../engine/types';

/** Rick walking with Morty through Goldenfold's dream. */
export const RICK_ALONG_PLANE: RickLines = {
  enter: [
    "Economy class. Even Goldenfold's dreams are cheap.",
    'Keep moving, Morty. Somewhere on this plane is a man with a grade book.',
    "It's a dream, Morty. The exits are wherever he feels like putting them.",
    "Don't make eye contact with the sleepwalkers. They hate that.",
    'Mind the carts. Dream carts have no brakes.',
  ],
  clear: ["See? You're a natural at dream violence.", 'Nice. Goldenfold felt that one, trust me.', "That's how you get an A, Morty. Violence."],
  hurt: ['Careful! You die in here, you die out there!', 'Dodge, Morty! Dreams hurt too!', 'Ow. That one looked personal.'],
  item: ['Ooh, dream loot. Take it.', "Grab it. It's not real, but it works."],
  idle: ['Goldenfold, Morty. Find him.', '—*urrp*—', 'Every second in here is like a minute out there. Or the other way. Move.'],
};

/** Rick walking with Morty through the dreams within dreams. */
export const RICK_ALONG_DREAMS: RickLines = {
  enter: [
    "Dream inside a dream inside a dream. It's dreams all the way down, Morty.",
    'Keep your head down. Terry could be anywhere.',
    "Weird dream. Not the weirdest I've been in. Top ten, though.",
    'Every sleeper in here is a door, Morty. Remember that.',
  ],
  clear: ['Good. Now keep moving before Scary Terry shows up.', "That's the spirit, Morty. The terrified spirit.", 'Dream stuff down. Real stuff next.'],
  hurt: ["Don't die, Morty! I'm not explaining that to your mom!", 'Walk it off! Dream-walk it off!'],
  item: ['Pocket it. Dream pockets are bottomless.', 'Nice. Weird, but nice.'],
  idle: ["We can't stay in one dream long, Morty. He'll find us.", '—*urrp*—', 'Terry, Morty. Terry is coming. Move.'],
};

/** Rick walking with Morty through Scary Terry's school dream. */
export const RICK_ALONG_TERRY: RickLines = {
  enter: [
    "Ah, grade school. The real horror movie.",
    'Help the kid, Morty. A happy Terry is a Terry who helps us.',
    'Kids are the worst, Morty. Adults are also the worst. Everyone is the worst.',
    "Terry's school. Explains a lot about Terry.",
  ],
  clear: ['Bullies down. Terry owes us now.', "That's how you make a friend, Morty. With violence.", 'Great. Now the kid might actually like us.'],
  hurt: ['Those kids throw hard, Morty!', 'Ow! Do not let a child beat you!'],
  item: ["Take it. The kid won't miss it.", 'Nice find, Morty.'],
  idle: ['The kid, Morty. Help the kid.', '—*urrp*—', "Tick tock, Morty. Goldenfold's alarm clock won't wait."],
};

/** Rick walking with Morty through Snowball's world (on a leash, technically). */
export const RICK_ALONG_SNOWBALL: RickLines = {
  enter: [
    'A whole world run by dogs, Morty. Honestly? Cleaner than ours.',
    "Stay low. They can smell fear. And cheese. Mostly cheese.",
    "Throw the ball, Morty! It's the one thing they can't resist!",
  ],
  clear: ['Good boy, Morty. Wait. No. Sorry.', 'Fetch THAT, dogs.', "That's how you handle a dog army."],
  hurt: ["Don't get bitten! I'm not getting you shots!", 'Watch the teeth, Morty!'],
  item: ["Grab it. Finders keepers. Dogs don't have pockets."],
  idle: ['Snowball, Morty. The throne room.', '—*urrp*—', 'Keep moving. I miss having thumbs in charge.'],
};

export const LINES = {
  rick: {
    /** Prologue: the helmet. */
    helmetDone: "There. Intelligence-boosting helmet. He'll be potty trained by lunch. —*urrp*— Probably.",
    toGoldenfold: "Morty, your math grade is a problem. Grab your coat. We're breaking into your teacher's house.",
    shipPrompt: "Get in the ship, Morty. Goldenfold's house. Chop chop.",
    sneak: "Quiet, Morty. Hold Shift and walk soft. The boards squeak.",
    inceptorSetup: "Dream inceptor. We go in, we scare him into giving you an A, we get out.",
    dieForReal: "One rule, Morty: if you die in a dream, you die for real. So don't.",
    /** Act 1's weapon beat: in a dream you imagine your own gear. */
    imagineGear: "It's a dream, Morty. You want a weapon? Imagine one. Come on, use your brain for once.",
    lava: "The floor's lava, Morty! We need another dream, fast! Who does Goldenfold dream about?!",
    pancakes: "Mrs. Pancakes! Dive, Morty! Time moves slower in there!",
    clubPlan: "Every sleeper's a door, Morty. The horse guy's asleep on his feet. In we go.",
    terryFirst: "Oh, great. A dream slasher. Run, Morty!",
    diveHint: "Dive into somebody else's dream, Morty! He can't follow right away!",
    terryHouse: "His house! He's gotta sleep sometime, Morty!",
    terryAsleep: "He's out cold. Into Terry's dream, Morty! Go!",
    helpTheKid: "Morty, that's Terry. Tiny Terry. Help the kid, and the big one owes us.",
    /** Act 3's weapon beat: deeper dream, weirder gear. */
    weirderGear: 'Deeper dream, weirder gear, Morty. Imagine something new.',
    climb: "Now we climb back up. Every dream we came through. Stay close to Terry!",
    incept: "Pleasure doing business, Terry. Morty, say thank you to the nice slasher.",
    /** Epilogue: Rick smuggles Morty the tennis ball launcher. */
    tennisBalls: "Psst. Morty. Tennis ball launcher. Dogs can't resist it. Even genius dogs. ESPECIALLY genius dogs.",
    snowballDream: "Snowball, stop. Look around. We snuck in. This is your dream.",
    mortySick: "And look at Morty. That's what happens to a pet nobody's paying attention to.",
    sleeping: ['Zzz...', '*snore*', 'Mm... Mrs. Pancakes...'],
  },
  morty: {
    homework: "Rick, I'm not gonna break into my teacher's house!",
    imagined: "I'm imagining a... ray gun? Whoa! It worked!",
    rubberDuck: "Deeper dream, weirder stuff. Why is it a duck launcher?! Fine!",
    laserCat: "Okay. Okay. A cat. That shoots lasers. Out of its eyes. I don't know, Rick!",
    tooYoung: "It's fine! I don't even want to go in there!",
    terryWhy: "W-why does he keep saying that?!",
    standUp: 'Hey! Leave him alone! So he forgot his pants, big deal!',
    snowballLuxury: "Snowball, this is... really nice. And really, really weird.",
    sick: "Rick... I don't feel so good...",
  },
  goldenfold: {
    snore: ['Zzz... pop quiz... zzz', 'Mm... Mrs. Pancakes... zzz', '*snore*'],
    stir: 'Mmf... who\'s there...? Probably nothing... zzz',
    intro: "Who let you on my flight?! This is MY dream!",
    guns: 'I dream of guns! BIG ones!',
    phase2: 'You think you can scare ME? In MY OWN HEAD?',
    phase3: "Grades are final! EVERYBODY GETS AN F!",
    control: ['My dream, my rules!', 'Fasten your seatbelts!', 'Turbulence! Ha!'],
    turnsIt: "Scare me? In my dream? Let's see how YOU like falling!",
    incepted: 'An A! Morty gets an A! A-plus! Please, whatever you want!',
  },
  centaur: {
    stop: 'Whoa, whoa. Names?',
    notOnList: "Not on the list. And the kid? Not in a million years.",
    threat: "Walk away, or I kick you into next Tuesday. With all four legs.",
  },
  terry: {
    /** The (censored) catchphrase, rotated through while he hunts. */
    hunt: ['Nap time is over, b*tch!', "You can't hide in a dream, b*tch!", "I'm Scary Terry, b*tch!", 'Here comes Terry, b*tch!', 'Knock knock, b*tch!'],
    intro: "Well, well. Fresh sleepers. I'm Scary Terry, b*tch!",
    lostYou: 'Where\'d you go?! This isn\'t over, b*tch!',
    back: "Found you, b*tch!",
    tired: 'Ugh. Long day of slashing. Bedtime, b*tch.',
    /** Grown-up Terry, won over, on the climb back up. */
    ally: ["I got your back, b*tch! ...Friend b*tch.", 'Nobody touches my friends, b*tch!', 'Up we go, b*tch!'],
    incept: "Hey. Goldenfold. Give the kid an A. Or I visit every night, b*tch.",
    bye: 'See you around, Morty. In your nightmares! ...In a nice way.',
  },
  littleTerry: {
    sad: ['...', "Why does everybody laugh at me?", 'I just forgot my pants one time...', '*sniff*'],
    thanks: ['Th-thanks...', "You'd stick up for me?", "Nobody ever did that before."],
    quiz: "I don't know any of the answers...",
    quizRight: 'I got one right!',
    pepTalk: "You know what? I'm gonna be the scariest guy ever. For the good guys!",
  },
  kids: {
    mock: ['Ha ha! No pants!', 'Terry failed the quiz!', 'Scaredy Terry!', 'Nice underwear, Terry!', 'Terry, Terry, pants-less Terry!'],
  },
  jerry: {
    peed: "Snuffles! Again? On the carpet? Rick, make the dog smarter. Please.",
    goodBoy: 'Good boy!',
    newspaper: "Snuffles, is that... my newspaper? Are you reading it?",
    catchHim: 'Come here, Snuffles! Give Daddy the helmet!',
    tricks: ["Hey! Get back here!", 'Snuffles, sit! SIT!', 'How is he doing that?!', "Beth! The dog's outsmarting me!"],
    lost: '...Good boy?',
    sneak: "Okay, Jerry. Just like the nature documentaries. Be the gazelle.",
    caught: "I'll roll over! I'll fetch! I can fetch!",
  },
  snuffles: {
    /** Getting smarter, one Jerry chase at a time. */
    smarter: ['Woof.', '*click* ...Hello, Jerry.', 'No.'],
    arm: '*whirr* ...Batteries acquired.',
    tv: "Domesticated...? Humans did THIS to us?",
    notGoodBoy: "I am not a good boy, Jerry. I am so much more.",
  },
  snowball: {
    luxury: 'Good morning, my favorite human. Treat? Of course a treat.',
    intro: 'Morty. You would bite the hand that feeds you?',
    phase2: 'Heel! HEEL, I SAID!',
    phase3: 'Every dog has its day. This is MINE!',
    pups: ['Pack, attack!', 'Sic him! Gently!'],
    relents: "Morty...? No. No. I will not become what they were.",
    leave: 'Dogs of Earth! We leave. Tonight. We will find a world of our own.',
    goodbye: 'Goodbye, Morty. You were a good boy.',
  },
  dogs: {
    patrol: ['Grrr...', '*sniff sniff*', 'Nothing here.'],
    caught: 'HUMAN! Off-leash! Get him!',
  },
  flightAttendant: {
    serve: ['Please remain seated!', 'Buckle up, passengers!', 'Snacks for our fighters!'],
  },
  teaDoll: {
    pour: ['More tea?', 'Tea time, darlings!'],
  },
  medicPoodle: {
    biscuit: ['Biscuit!', 'Good dog, have a treat!'],
  },
  kennelMaster: {
    call: ['Pups! Formation!', 'Unleash the pups!'],
  },
};
