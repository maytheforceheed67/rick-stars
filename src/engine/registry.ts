/**
 * Collects every episode's content into lookup tables and validates it: every referenced id must
 * exist, and canon gating must hold (an episode only uses content that has appeared by then).
 */
import { TRACKS, type Track } from './audio/music';
import { SFX, type SfxRecipe } from './audio/sfx';
import { checkTemplate, DIRS, parseTemplate, type Dir, type ParsedTemplate } from './dungeon/templates';
import { ROOM_COLS, ROOM_ROWS } from './constants';
import { availableIn, isEpisodeId } from './episodes';
import { buildFixedFloor } from './dungeon/generate';
import { ENGINE_SPRITES } from './art/engineSprites';
import type {
  ActDef,
  BackdropDef,
  CharacterDef,
  ContentId,
  ContentMeta,
  CutsceneDef,
  EncounterDef,
  EnemyDef,
  EpisodeContent,
  EpisodeDef,
  EpisodeId,
  EpisodeListing,
  GadgetDef,
  ItemDef,
  MechanicDef,
  PickupDef,
  RoomScriptDef,
  RoomTemplate,
  SpecialRoomDef,
  SpriteArt,
  StatusDef,
  SynergyDef,
  TransformationDef,
  UpgradeDef,
} from './types';

export interface Registry {
  listings: EpisodeListing[];
  episodes: Map<EpisodeId, EpisodeDef>;
  characters: Map<ContentId, CharacterDef>;
  items: Map<ContentId, ItemDef>;
  synergies: SynergyDef[];
  transformations: TransformationDef[];
  statuses: Map<ContentId, StatusDef>;
  enemies: Map<ContentId, EnemyDef>;
  encounters: Map<ContentId, EncounterDef>;
  specialRooms: Map<ContentId, SpecialRoomDef>;
  mechanics: Map<ContentId, MechanicDef>;
  gadgets: Map<ContentId, GadgetDef>;
  pickups: Map<ContentId, PickupDef>;
  cutscenes: Map<ContentId, CutsceneDef>;
  backdrops: Map<string, BackdropDef>;
  templates: Map<ContentId, ParsedTemplate>;
  templateSources: Map<ContentId, RoomTemplate>;
  scripts: Map<ContentId, RoomScriptDef>;
  sprites: Map<string, SpriteArt>;
  upgrades: Map<ContentId, UpgradeDef>;
  /** Merged bark pools from every episode. */
  barks: Map<string, string[]>;
  /** Every music track and sound effect: the engine's built-ins plus what content adds. */
  music: Map<string, Track>;
  sfx: Map<string, SfxRecipe>;
  /** Problems found while assembling (duplicate ids). */
  buildErrors: string[];
}

export function buildRegistry(listings: EpisodeListing[], shared: EpisodeContent, upgrades: UpgradeDef[]): Registry {
  const reg: Registry = {
    listings,
    episodes: new Map(),
    characters: new Map(),
    items: new Map(),
    synergies: [],
    transformations: [],
    statuses: new Map(),
    enemies: new Map(),
    encounters: new Map(),
    specialRooms: new Map(),
    mechanics: new Map(),
    gadgets: new Map(),
    pickups: new Map(),
    cutscenes: new Map(),
    backdrops: new Map(),
    templates: new Map(),
    templateSources: new Map(),
    scripts: new Map(),
    sprites: new Map(),
    upgrades: new Map(),
    barks: new Map(),
    music: new Map(Object.entries(TRACKS)),
    sfx: new Map(Object.entries(SFX)),
    buildErrors: [],
  };
  const errors = reg.buildErrors;

  // Ids must be unique within a category. The same id may appear in different categories on
  // purpose (a boss enemy and its portrait character, an item and the mechanic it drives).
  const put = <T extends { id: string }>(map: Map<string, T>, value: T, category: string) => {
    if (map.has(value.id)) {
      errors.push(`Duplicate ${category} id "${value.id}"`);
      return;
    }
    map.set(value.id, value);
  };
  const putSprite = (art: SpriteArt) => {
    const existing = reg.sprites.get(art.key);
    if (existing && existing !== art) errors.push(`Duplicate sprite key "${art.key}"`);
    reg.sprites.set(art.key, art);
  };

  const bundles: EpisodeContent[] = [shared];
  for (const l of listings) {
    if (!l.def) continue;
    if (l.def.id !== l.id) errors.push(`Listing ${l.id} points at episode def ${l.def.id}`);
    reg.episodes.set(l.id, l.def);
    bundles.push(l.def.content);
  }

  for (const c of bundles) {
    c.characters.forEach((x) => {
      put(reg.characters, x, 'character');
      if (x.sprite) putSprite(x.sprite);
    });
    c.items.forEach((x) => put(reg.items, x, 'item'));
    c.synergies.forEach((x) => {
      if (reg.synergies.some((s) => s.id === x.id)) errors.push(`Duplicate synergy id "${x.id}"`);
      reg.synergies.push(x);
    });
    c.transformations?.forEach((x) => {
      if (reg.transformations.some((t) => t.id === x.id)) errors.push(`Duplicate transformation id "${x.id}"`);
      reg.transformations.push(x);
    });
    c.statuses.forEach((x) => put(reg.statuses, x, 'status'));
    c.enemies.forEach((x) => {
      put(reg.enemies, x, 'enemy');
      putSprite(x.art);
    });
    c.encounters.forEach((x) => put(reg.encounters, x, 'encounter'));
    c.specialRooms.forEach((x) => put(reg.specialRooms, x, 'special room'));
    c.mechanics.forEach((x) => put(reg.mechanics, x, 'mechanic'));
    c.gadgets.forEach((x) => put(reg.gadgets, x, 'gadget'));
    c.pickups.forEach((x) => put(reg.pickups, x, 'pickup'));
    c.cutscenes.forEach((x) => put(reg.cutscenes, x, 'cutscene'));
    c.backdrops.forEach((x) => put(reg.backdrops, x, 'backdrop'));
    c.templates.forEach((x) => {
      put(reg.templateSources, x, 'template');
      reg.templates.set(x.id, parseTemplate(x));
    });
    c.scripts.forEach((x) => put(reg.scripts, x, 'script'));
    c.sprites.forEach(putSprite);
    for (const [key, lines] of Object.entries(c.barks ?? {})) reg.barks.set(key, [...(reg.barks.get(key) ?? []), ...lines]);
    for (const [id, track] of Object.entries(c.music ?? {})) {
      if (reg.music.has(id)) errors.push(`Duplicate music track id "${id}"`);
      else reg.music.set(id, track);
    }
    for (const [id, recipe] of Object.entries(c.sfx ?? {})) {
      if (reg.sfx.has(id)) errors.push(`Duplicate sound effect id "${id}"`);
      else reg.sfx.set(id, recipe);
    }
  }
  upgrades.forEach((u) => put(reg.upgrades, u, 'upgrade'));
  // unlocksOnClear can name items or enemies, so those two must not share ids.
  for (const id of reg.items.keys()) if (reg.enemies.has(id)) errors.push(`Id "${id}" is both an item and an enemy`);
  return reg;
}

/**
 * Every enemy an act can put in front of Morty: its pool, its bosses, and whatever those bring
 * into the room (EnemyDef.spawns). Missing ids are skipped here; validation reports them.
 */
export function actEnemies(reg: Pick<Registry, 'enemies'>, act: ActDef): EnemyDef[] {
  const out = new Map<ContentId, EnemyDef>();
  const visit = (id: ContentId) => {
    const e = reg.enemies.get(id);
    if (!e || out.has(id)) return;
    out.set(id, e);
    e.spawns?.forEach(visit);
  };
  act.enemyPool.forEach((w) => visit(w.id));
  for (const f of act.finale) if (f.kind === 'boss') visit(f.boss);
  return [...out.values()];
}

/** Every act an episode can play, in order. */
export function episodeActs(ep: EpisodeDef): ActDef[] {
  return [...(ep.prologue ? [ep.prologue] : []), ...ep.acts, ...(ep.epilogue ? [ep.epilogue] : [])];
}

/** Returns a list of problems; an empty list means the content is good to go. */
export function validateRegistry(reg: Registry): string[] {
  const errors = [...reg.buildErrors];
  const err = (msg: string) => errors.push(msg);

  const metas: [string, ContentMeta][] = [
    ...[...reg.characters.values()].map((x) => ['character', x] as [string, ContentMeta]),
    ...[...reg.items.values()].map((x) => ['item', x] as [string, ContentMeta]),
    ...reg.synergies.map((x) => ['synergy', x] as [string, ContentMeta]),
    ...reg.transformations.map((x) => ['transformation', x] as [string, ContentMeta]),
    ...[...reg.statuses.values()].map((x) => ['status', x] as [string, ContentMeta]),
    ...[...reg.enemies.values()].map((x) => ['enemy', x] as [string, ContentMeta]),
    ...[...reg.encounters.values()].map((x) => ['encounter', x] as [string, ContentMeta]),
    ...[...reg.specialRooms.values()].map((x) => ['special room', x] as [string, ContentMeta]),
    ...[...reg.mechanics.values()].map((x) => ['mechanic', x] as [string, ContentMeta]),
    ...[...reg.gadgets.values()].map((x) => ['gadget', x] as [string, ContentMeta]),
    ...[...reg.pickups.values()].map((x) => ['pickup', x] as [string, ContentMeta]),
    ...[...reg.cutscenes.values()].map((x) => ['cutscene', x] as [string, ContentMeta]),
  ];
  for (const [category, m] of metas) {
    if (!isEpisodeId(m.firstAppears)) err(`${category} "${m.id}" has a bad firstAppears "${m.firstAppears}"`);
  }

  const checkTemplateId = (id: ContentId, where: string, doors: Dir[], opts: { spawns?: boolean; standard?: boolean } = {}) => {
    const t = reg.templates.get(id);
    const src = reg.templateSources.get(id);
    if (!t || !src) {
      err(`${where}: template "${id}" doesn't exist`);
      return;
    }
    const size = opts.standard ? { cols: ROOM_COLS, rows: ROOM_ROWS } : undefined;
    for (const e of checkTemplate(t, src.rows, { doors, requireSpawns: opts.spawns, size })) err(`${where}: ${e}`);
  };

  const engineArt = new Set(ENGINE_SPRITES.map((a) => a.key));
  const artExists = (key: string) => reg.sprites.has(key) || engineArt.has(key);

  for (const ep of reg.episodes.values()) {
    const E = ep.id;
    const sequence = episodeActs(ep);
    /** Referenced content must exist and must have appeared by episode E. */
    const gate = <T extends ContentMeta>(map: Map<ContentId, T>, id: ContentId, what: string, where: string): T | undefined => {
      const x = map.get(id);
      if (!x) {
        err(`${where}: ${what} "${id}" doesn't exist`);
        return undefined;
      }
      if (!availableIn(x, E)) err(`${where}: ${what} "${id}" first appears in ${x.firstAppears}, after ${E} (canon gating)`);
      return x;
    };

    for (const act of sequence) {
      const where = `${E} act "${act.id}"`;
      for (const id of [act.biome.music, act.music]) if (id && !reg.music.has(id)) err(`${where}: music track "${id}" doesn't exist`);
      gate(reg.characters, act.playable, 'character', where);
      gate(reg.gadgets, act.rick.gadget, 'gadget', where);
      for (const w of act.enemyPool) {
        const e = gate(reg.enemies, w.id, 'enemy', where);
        if (e?.hazard) err(`${where}: "${w.id}" is a hazard; list it under hazards, not the enemy pool`);
        if (!(w.weight > 0)) err(`${where}: enemy "${w.id}" needs a positive weight`);
      }
      for (const e of actEnemies(reg, act)) gate(reg.enemies, e.id, 'enemy', where);
      for (const w of act.hazards ?? []) {
        const h = gate(reg.enemies, w.id, 'hazard', where);
        if (h && !h.hazard) err(`${where}: "${w.id}" is listed as a hazard but isn't one`);
        if (!(w.weight > 0)) err(`${where}: hazard "${w.id}" needs a positive weight`);
      }
      for (const w of act.itemPool) {
        const item = gate(reg.items, w.id, 'item', where);
        if (item?.noPool) err(`${where}: story item "${w.id}" can't be in a random pool`);
        if (!(w.weight > 0)) err(`${where}: item "${w.id}" needs a positive weight`);
      }
      // Every weapon needs a story reason the player sees (docs/ADDING_AN_EPISODE.md).
      const fights = act.enemyPool.length > 0 || act.finale.some((f) => f.kind === 'boss');
      if (act.weapon) {
        const w = gate(reg.items, act.weapon.item, 'weapon', where);
        if (w && w.kind !== 'weapon') err(`${where}: story weapon "${act.weapon.item}" isn't a weapon`);
        gate(reg.characters, act.weapon.from, 'character', where);
        if (!act.weapon.line.trim()) err(`${where}: story weapon "${act.weapon.item}" needs a line saying where it comes from`);
        if (act.unarmed) err(`${where}: an unarmed act can't hand out a weapon`);
      } else if (fights && !act.unarmed) {
        err(`${where}: has enemies but no story weapon (ActDef.weapon)`);
      }
      // No generic exits between acts: Morty leaves the way the show does (ship, portal, departure).
      if (act !== sequence[sequence.length - 1] && !act.travel && !act.interlude) err(`${where}: needs a way to the next act (ActDef.travel)`);
      if (act.interlude && !act.unarmed) err(`${where}: an interlude is a cutaway with nothing to fight; mark it unarmed`);
      if (typeof act.arrive === 'object' && !artExists(act.arrive.art)) err(`${where}: arrival art "${act.arrive.art}" doesn't exist`);
      if (act.layout.kind === 'procedural') {
        for (const b of act.layout.regions ?? []) if (!reg.music.has(b.music)) err(`${where}: region "${b.id}" music "${b.music}" doesn't exist`);
      }
      if (act.travel?.art && !artExists(act.travel.art)) err(`${where}: travel art "${act.travel.art}" doesn't exist`);
      if (act.stageExit && !artExists(act.stageExit.art)) err(`${where}: stage exit art "${act.stageExit.art}" doesn't exist`);
      if (act.travel && !act.travel.label.trim()) err(`${where}: travel needs a label`);
      for (const id of act.mechanics) gate(reg.mechanics, id, 'mechanic', where);
      for (const id of act.startStatuses ?? []) gate(reg.statuses, id, 'status', where);
      for (const id of [...(act.intro ?? []), ...(act.outro ?? [])]) gate(reg.cutscenes, id, 'cutscene', where);
      for (const id of act.shop?.alwaysStocks ?? []) gate(reg.items, id, 'item', where);
      if (act.shop && !reg.sprites.has(act.shop.keeperArt)) err(`${where}: shopkeeper art "${act.shop.keeperArt}" doesn't exist`);
      if (act.specialRoom) {
        const sr = gate(reg.specialRooms, act.specialRoom, 'special room', where);
        sr?.templates.forEach((t) => checkTemplateId(t, `${where} special room`, [...DIRS], { standard: true }));
      }

      act.finale.forEach((stage, i) => {
        if (stage.biome && !reg.music.has(stage.biome.music)) err(`${where}: finale biome "${stage.biome.id}" music "${stage.biome.music}" doesn't exist`);
        // The first stage is a dead end on the floor grid, so its door may be on any side.
        const doors: Dir[] = i === 0 && act.layout.kind === 'procedural' ? [...DIRS] : [];
        if (stage.kind === 'boss') {
          const boss = gate(reg.enemies, stage.boss, 'boss', where);
          if (boss && !boss.boss) err(`${where}: "${stage.boss}" is an enemy, not a boss`);
          if (boss?.boss?.defeatCutscene) gate(reg.cutscenes, boss.boss.defeatCutscene, 'cutscene', where);
          if (boss?.boss?.character) gate(reg.characters, boss.boss.character, 'character', where);
          if (boss?.boss?.reward) gate(reg.items, boss.boss.reward, 'item', where);
          if (boss?.boss?.music && !reg.music.has(boss.boss.music)) err(`${where}: boss music "${boss.boss.music}" doesn't exist`);
          checkTemplateId(stage.template, `${where} finale`, doors);
        } else {
          const enc = gate(reg.encounters, stage.encounter, 'encounter', where);
          if (enc) checkTemplateId(enc.template, `${where} finale`, doors);
          if (enc?.music && !reg.music.has(enc.music)) err(`${where}: encounter music "${enc.music}" doesn't exist`);
        }
        if (i > 0) {
          const tid = stage.kind === 'boss' ? stage.template : reg.encounters.get(stage.encounter)?.template;
          const t = tid ? reg.templates.get(tid) : undefined;
          if (t && !t.markers.some((m) => m.ch === 'P')) err(`${where}: finale stage ${i + 1} template needs a P spawn`);
        }
      });

      const layout = act.layout;
      if (layout.kind === 'procedural') {
        if (layout.templates.length < 12) err(`${where}: needs at least 12 combat templates (has ${layout.templates.length})`);
        for (const t of layout.templates) checkTemplateId(t, where, [...DIRS], { spawns: true, standard: true });
        for (const t of [layout.startTemplate, layout.treasureTemplate, layout.shopTemplate]) {
          checkTemplateId(t, where, [...DIRS], { standard: true });
        }
        if (layout.calmPrefix) {
          for (const t of [...layout.calmPrefix.templates, layout.calmPrefix.lastTemplate]) {
            checkTemplateId(t, `${where} calm prefix`, [...DIRS], { standard: true });
          }
        }
        if (layout.roomCount[0] < 4 || layout.roomCount[0] > layout.roomCount[1]) err(`${where}: bad roomCount`);
      } else {
        const floor = buildFixedFloor(layout);
        for (const trip of layout.trips ?? []) {
          for (const end of [trip.from, trip.to]) {
            if (!floor.rooms.some((r) => r.x === end.x && r.y === end.y)) err(`${where}: trip end ${end.x},${end.y} isn't a room`);
          }
        }
        for (const r of floor.rooms) {
          const doors = Object.keys(r.neighbors) as Dir[];
          checkTemplateId(r.template, `${where} fixed room ${r.x},${r.y}`, doors);
          if (r.script && !reg.scripts.has(r.script)) err(`${where}: script "${r.script}" doesn't exist`);
        }
      }
    }

    for (const id of ep.unlocksOnClear) {
      if (!reg.items.has(id) && !reg.enemies.has(id)) err(`${E}: unlocksOnClear "${id}" doesn't exist`);
    }

    for (const cs of ep.content.cutscenes) {
      const where = `cutscene "${cs.id}"`;
      if (cs.panels.length < 2 || cs.panels.length > 6) err(`${where} has ${cs.panels.length} panels (needs 2-6)`);
      for (const p of cs.panels) {
        if (!reg.backdrops.has(p.backdrop)) err(`${where}: backdrop "${p.backdrop}" doesn't exist`);
        for (const who of [...(p.speaker ? [p.speaker] : []), ...(p.cast ?? [])]) {
          const c = reg.characters.get(who);
          if (!c) err(`${where}: character "${who}" doesn't exist`);
          else if (!availableIn(c, cs.firstAppears)) err(`${where}: ${who} appears before ${c.firstAppears} (canon gating)`);
        }
      }
    }
  }

  for (const s of reg.synergies) {
    for (const id of s.requires) {
      const item = reg.items.get(id);
      if (!item) err(`synergy "${s.id}" requires missing item "${id}"`);
      else if (item.kind === 'consumable') err(`synergy "${s.id}" requires consumable "${id}", which is never held`);
    }
    if (s.requires.length < 2) err(`synergy "${s.id}" needs at least two items`);
  }
  for (const t of reg.transformations) {
    for (const id of t.set) {
      const item = reg.items.get(id);
      if (!item) err(`transformation "${t.id}" lists missing item "${id}"`);
      else if (item.kind === 'consumable' || item.kind === 'weapon') err(`transformation "${t.id}" lists "${id}", which never counts (only passives and actives do)`);
    }
    const need = t.count ?? 3;
    if (need < 2 || need > t.set.length) err(`transformation "${t.id}" needs ${need} of ${t.set.length} items`);
    if (t.look.accessory && !reg.sprites.has(t.look.accessory)) err(`transformation "${t.id}": accessory "${t.look.accessory}" doesn't exist`);
  }
  for (const item of reg.items.values()) {
    if (item.companion && !reg.sprites.has(item.companion.art)) err(`item "${item.id}": companion art "${item.companion.art}" doesn't exist`);
    if (item.look?.accessory && !reg.sprites.has(item.look.accessory)) err(`item "${item.id}": accessory "${item.look.accessory}" doesn't exist`);
    if (item.kind === 'active' && !item.active) err(`item "${item.id}" is active but has no active use`);
    if (item.kind === 'consumable' && !item.consumable) err(`item "${item.id}" is a consumable but has no use`);
    if (item.kind === 'weapon' && !item.weapon) err(`item "${item.id}" is a weapon but has no weapon spec`);
    if (!(item.price >= 0)) err(`item "${item.id}" needs a price`);
  }
  for (const e of reg.enemies.values()) {
    if (!(e.hp > 0) || !(e.radius > 0)) err(`enemy "${e.id}" needs positive hp and radius`);
    for (const id of e.spawns ?? []) if (!reg.enemies.has(id)) err(`enemy "${e.id}" spawns missing enemy "${id}"`);
    if (e.stalker && (e.boss || e.hazard)) err(`enemy "${e.id}": a stalker can't also be a boss or a hazard`);
    if (e.stalker && !(e.stalker.staggerHits >= 1 && e.stalker.staggerSeconds > 0)) err(`enemy "${e.id}": stalker needs staggerHits >= 1 and staggerSeconds > 0`);
  }
  for (const p of reg.pickups.values()) if (!reg.sprites.has(p.art)) err(`pickup "${p.id}" art "${p.art}" doesn't exist`);
  for (const sr of reg.specialRooms.values()) {
    for (const t of sr.templates) if (!reg.templates.has(t)) err(`special room "${sr.id}": template "${t}" doesn't exist`);
  }
  for (const enc of reg.encounters.values()) {
    if (!reg.templates.has(enc.template)) err(`encounter "${enc.id}": template "${enc.template}" doesn't exist`);
  }
  for (const u of reg.upgrades.values()) {
    if (u.costs.length === 0 || u.costs.some((c) => !(c > 0))) err(`upgrade "${u.id}" needs positive costs`);
    if (u.unlocks) {
      const item = reg.items.get(u.unlocks);
      if (!item) err(`upgrade "${u.id}" unlocks missing item "${u.unlocks}"`);
      else if (!item.locked) err(`upgrade "${u.id}" unlocks "${u.unlocks}", which isn't locked`);
    }
    if (u.startItem && !reg.items.has(u.startItem)) err(`upgrade "${u.id}" starts with missing item "${u.startItem}"`);
  }
  return errors;
}
