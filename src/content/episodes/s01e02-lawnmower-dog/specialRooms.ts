/** The special rooms of "Lawnmower Dog": one per act. */
import type { SpecialRoomDef } from '../../../engine/types';
import { LAWNMOWER_DOG, PILOT } from '../../balance';
import { mathQuestion } from '../s01e01-pilot/specialRooms';
import { LINES } from './dialogue';

const S01E02 = 'S01E02' as const;

/** Goldenfold's dream: first class. A rare item on a reclining seat, and a free snack. */
export const firstClass: SpecialRoomDef = {
  id: 'dog-first-class',
  name: 'First Class',
  firstAppears: S01E02,
  canon: false,
  icon: 'F',
  templates: ['plane-first-class'],
  script: (api) => ({
    onEnter(first) {
      if (first) {
        const at = api.room.markers('I')[0];
        const id = api.randomItem({ rarity: 'rare' }) ?? api.randomItem();
        if (at && id) api.spawnPedestal(id, at.x, at.y);
        api.spawnPickup('heart-full', api.room.widthPx / 2 - 120, api.room.heightPx / 2);
        api.toast('First class. Complimentary everything.', { color: 0xf2c14e, seconds: 2.2 });
      }
      api.completeRoom();
    },
  }),
};

/** The little girl's toy chest: three items, take one. */
export const toyChest: SpecialRoomDef = {
  id: 'dog-toy-chest',
  name: 'The Toy Chest',
  firstAppears: S01E02,
  canon: false,
  icon: 'T',
  templates: ['dream-toy-chest'],
  script: (api) => ({
    onEnter(first) {
      if (first) {
        for (const p of api.room.markers('I')) {
          const id = api.randomItem();
          if (id) api.spawnPedestal(id, p.x, p.y, { choiceGroup: 'toy-chest' });
        }
        api.toast('The toy chest: take ONE.', { color: 0xf8c4dc, seconds: 2.5 });
      }
      api.completeRoom();
    },
  }),
};

/**
 * Terry's pop quiz, the reason the other kids laugh at him. It reuses the Pilot's quiz: Morty
 * whispers the answers while the room fills with pop quizzes. Every right answer lifts Terry's
 * confidence (mechanics/terryConfidence.ts).
 */
export const terrysQuiz: SpecialRoomDef = {
  id: 'dog-terry-quiz',
  name: "Terry's Pop Quiz",
  firstAppears: S01E02,
  canon: true,
  icon: '?',
  templates: ['school-quiz'],
  script: (api) => {
    const data = api.room.data as { done?: boolean };
    const Q = PILOT.quiz;
    const C = LAWNMOWER_DOG.confidence;
    let active = false;
    let asked = 0;
    let right = 0;
    let spawnTimer = 1.4;

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
        api.toast('Terry aced it!', { color: 0x97ce4c, banner: true, sub: 'First A of his life. In a dream. Still counts.' });
        const reward = api.randomItem({ rarity: 'rare' }) ?? api.randomItem();
        if (reward) api.spawnPedestal(reward, at.x, at.y + 150);
      } else {
        api.sfx('wrong');
        api.say('little-terry', LINES.littleTerry.quiz, 2.4);
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
        title: `Terry's pop quiz: question ${asked} of ${Q.questions} (whisper him the answer)`,
        question: q.text,
        options: q.options,
        correct: q.correct,
        timeLimit: Q.secondsEach,
        speaker: 'little-terry',
        onAnswer: (i) => {
          if (i === q.correct) {
            right++;
            api.flags.terryConfidence = Math.min(100, ((api.flags.terryConfidence as number | undefined) ?? C.start) + C.perAnswer);
            api.sfx('correct');
            api.say('little-terry', LINES.littleTerry.quizRight, 1.4);
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
          api.addProp({ art: 'nightmare-teacher', x: desk.x + 90, y: desk.y + 30, solid: true, radius: 18 });
          api.addProp({ art: 'little-terry', x: desk.x - 70, y: desk.y + 26, actor: 'little-terry' });
        }
        if (data.done) return;
        active = true;
        api.lockDoors();
        api.setObjective("Terry's pop quiz: whisper him the answers (keys 1-4) while you dodge!");
        api.say('little-terry', LINES.littleTerry.quiz, 2.6);
        api.after(2.4, ask);
      },
      update(dt) {
        if (!active) return;
        spawnTimer -= dt;
        if (spawnTimer <= 0) {
          spawnTimer = 2.6;
          if (api.enemyCount() < 5) {
            const p = api.room.randomFloorPoint(api.rng, 240);
            api.spawnEnemy(api.rng.chance(0.6) ? 'pop-quiz' : 'mocking-kid', p.x, p.y);
          }
        }
      },
      onExit() {
        api.hideChoice();
      },
    };
  },
};

export const DOG_SPECIAL_ROOMS: SpecialRoomDef[] = [firstClass, toyChest, terrysQuiz];
