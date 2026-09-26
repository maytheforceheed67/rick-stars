/** The Pilot's special rooms: one per act. */
import type { Rng } from '../../../engine/rng';
import type { SpecialRoomDef } from '../../../engine/types';
import { PILOT } from '../../balance';
import { LINES } from './dialogue';

interface Question {
  text: string;
  options: string[];
  correct: number;
}

/** A quick arithmetic question with plausible wrong answers. */
export function mathQuestion(rng: Rng): Question {
  let text: string;
  let answer: number;
  let b: number;
  switch (rng.int(0, 3)) {
    case 0: {
      const a = rng.int(3, 12);
      b = rng.int(3, 12);
      answer = a * b;
      text = `${a} × ${b} = ?`;
      break;
    }
    case 1: {
      const a = rng.int(12, 89);
      b = rng.int(11, 59);
      answer = a + b;
      text = `${a} + ${b} = ?`;
      break;
    }
    case 2: {
      const a = rng.int(40, 99);
      b = rng.int(11, 39);
      answer = a - b;
      text = `${a} − ${b} = ?`;
      break;
    }
    default: {
      b = rng.int(2, 9);
      answer = rng.int(3, 12);
      text = `${b * answer} ÷ ${b} = ?`;
    }
  }
  const options = [answer];
  const deltas = [1, -1, 2, -2, 10, -10, b, -b];
  let guard = 0;
  while (options.length < 4 && guard++ < 50) {
    const v = answer + rng.pick(deltas);
    if (v > 0 && !options.includes(v)) options.push(v);
  }
  for (let v = answer + 3; options.length < 4; v++) if (!options.includes(v)) options.push(v);
  rng.shuffle(options);
  return { text, options: options.map(String), correct: options.indexOf(answer) };
}

export const popQuizRoom: SpecialRoomDef = {
  id: 'pilot-pop-quiz',
  name: "Goldenfold's Pop Quiz",
  firstAppears: 'S01E01',
  canon: false,
  icon: '?',
  templates: ['school-quiz'],
  script: (api) => {
    const data = api.room.data as { done?: boolean };
    const Q = PILOT.quiz;
    let active = false;
    let asked = 0;
    let right = 0;
    let spawnTimer = 1;

    const finish = () => {
      active = false;
      data.done = true;
      api.hideChoice();
      api.clearEnemies();
      api.setObjective(null);
      api.unlockDoors();
      const at = api.room.markers('G')[0] ?? { x: api.room.widthPx / 2, y: api.room.heightPx / 2 };
      if (right === Q.questions) {
        api.sfx('victory');
        api.toast('A+! Perfect score!', { color: 0x97ce4c, banner: true, sub: 'Mr. Goldenfold looks genuinely confused.' });
        api.say('goldenfold', LINES.goldenfold.perfect, 3);
        const reward = api.hasItem('answer-key') ? api.randomItem({ rarity: 'rare' }) : 'answer-key';
        if (reward) api.spawnPedestal(reward, at.x, at.y + 150);
      } else {
        api.sfx('wrong');
        api.applyStatus('failing-grade');
        api.say('goldenfold', LINES.goldenfold.failed(right, Q.questions), 3);
      }
      api.completeRoom();
    };

    const ask = () => {
      if (!active) return;
      if (asked >= Q.questions) {
        finish();
        return;
      }
      const q = mathQuestion(api.rng);
      asked++;
      api.showChoice({
        title: `Pop Quiz: question ${asked} of ${Q.questions}`,
        question: q.text,
        options: q.options,
        correct: q.correct,
        timeLimit: Q.secondsEach,
        speaker: 'goldenfold',
        onAnswer: (i) => {
          if (i === q.correct) {
            right++;
            api.sfx('correct');
            api.toast('Correct!', { color: 0x97ce4c, seconds: 1.2 });
          } else {
            api.sfx('wrong');
            api.toast(i === null ? `Time's up! It was ${q.options[q.correct]}.` : `Wrong! It was ${q.options[q.correct]}.`, { color: 0xff8a3d, seconds: 1.6 });
          }
          api.after(1.1, ask);
        },
      });
    };

    return {
      onEnter() {
        const desk = api.room.markers('G')[0];
        if (desk) {
          api.addProp({ art: 'blackboard', x: desk.x, y: desk.y - 48, depth: -200 });
          api.addProp({ art: 'goldenfold-desk', x: desk.x, y: desk.y + 22, solid: true, radius: 40 });
          api.addProp({ art: 'goldenfold', x: desk.x + 80, y: desk.y + 20, solid: true, radius: 16, actor: 'goldenfold' });
        }
        if (data.done) return;
        active = true;
        api.lockDoors();
        api.setObjective("Goldenfold's Pop Quiz: answer with keys 1-4 while you dodge!");
        api.say('goldenfold', LINES.goldenfold.quizStart, 3);
        api.after(2.2, ask);
      },
      update(dt) {
        if (!active) return;
        spawnTimer -= dt;
        if (spawnTimer <= 0) {
          spawnTimer = 2.4;
          if (api.enemyCount() < 5) {
            const p = api.room.randomFloorPoint(api.rng, 240);
            api.spawnEnemy('pop-quiz', p.x, p.y);
          }
        }
      },
      onExit() {
        api.hideChoice();
      },
    };
  },
};

export const megaGrove: SpecialRoomDef = {
  id: 'pilot-mega-grove',
  name: 'Mega Tree Grove',
  firstAppears: 'S01E01',
  canon: true,
  icon: 'T',
  templates: ['35c-grove'],
  script: (api) => ({
    onEnter(first) {
      const tree = api.room.markers('T')[0];
      if (tree) api.addProp({ art: 'mega-tree', x: tree.x, y: tree.y + 40, solid: true, radius: 30 });
      if (first) {
        const at = api.room.markers('I')[0];
        const id = api.randomItem({ rarity: 'rare' }) ?? api.randomItem();
        if (at && id) api.spawnPedestal(id, at.x, at.y);
        api.say('morty', LINES.morty.groveSpotted, 3);
      }
      api.completeRoom();
    },
  }),
};

export const confiscatedVault: SpecialRoomDef = {
  id: 'pilot-confiscated-vault',
  name: 'Confiscated Goods',
  firstAppears: 'S01E01',
  canon: false,
  icon: 'V',
  templates: ['customs-vault'],
  script: (api) => ({
    onEnter(first) {
      const sign = api.room.markers('V')[0];
      if (sign) api.addProp({ art: 'confiscated-sign', x: sign.x, y: sign.y + 10 });
      if (first) {
        for (const p of api.room.markers('I')) {
          const id = api.randomItem();
          if (id) api.spawnPedestal(id, p.x, p.y, { choiceGroup: 'vault' });
        }
        api.toast('Confiscated Goods: take ONE.', { color: 0xffd54a, seconds: 2.5 });
      }
      api.completeRoom();
    },
  }),
};

export const PILOT_SPECIAL_ROOMS: SpecialRoomDef[] = [popQuizRoom, megaGrove, confiscatedVault];
