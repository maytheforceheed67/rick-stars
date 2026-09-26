import type { ChoicePrompt, ContentId, HudWidget, RoomKind, ToastOptions } from '../types';

export interface HudMapRoom {
  id: number;
  x: number;
  y: number;
  kind: RoomKind;
  visited: boolean;
  seen: boolean;
  cleared: boolean;
  current: boolean;
}

/** Snapshot the HUD reads from the run every frame. */
export interface HudModel {
  hp: number;
  maxHp: number;
  rick: { value: number; ready: boolean; gadget: string };
  active: { id: ContentId; name: string; charge: number; max: number } | null;
  consumable: { id: ContentId; name: string } | null;
  weapon: { id: ContentId; name: string };
  passives: { id: ContentId; name: string }[];
  scrap: number;
  statuses: { id: ContentId; name: string; positive: boolean; remaining: number; kind: string }[];
  actName: string;
  actNumber: number;
  actCount: number;
  widgets: HudWidget[];
  boss: { title: string; hp: number; maxHp: number } | null;
  objective: string | null;
  timer: { left: number; label: string } | null;
  hint: string | null;
  seed: string;
  time: number;
  map: { rooms: HudMapRoom[]; gridW: number; gridH: number; inAnnex: boolean } | null;
  mechanicHelp: string[];
}

export interface HudApi {
  toast(text: string, opts?: ToastOptions): void;
  banner(title: string, sub?: string, color?: number): void;
  itemBanner(name: string, blurb: string, kind: string): void;
  showChoice(prompt: ChoicePrompt): void;
  hideChoice(): void;
  toggleMap(): void;
}
