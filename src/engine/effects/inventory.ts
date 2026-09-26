import type { ContentId, ItemDef } from '../types';

export interface ActiveSlot {
  id: ContentId;
  charge: number;
  max: number;
}

export interface AddResult {
  /** False when the item was already owned (passives don't stack). */
  added: boolean;
  /** Item that was swapped out and should be dropped back on the floor. */
  dropped?: ContentId;
}

/** What the player is carrying. Pure logic; items are looked up by the caller. */
export class Inventory {
  weapon: ContentId;
  readonly passives: ContentId[] = [];
  active: ActiveSlot | null = null;
  consumable: ContentId | null = null;

  constructor(weapon: ContentId) {
    this.weapon = weapon;
  }

  /** Items that count for hooks, stats and synergies (consumables don't until used). */
  owned(): ContentId[] {
    const out = [this.weapon, ...this.passives];
    if (this.active) out.push(this.active.id);
    return out;
  }

  has(id: ContentId): boolean {
    return this.weapon === id || this.passives.includes(id) || this.active?.id === id || this.consumable === id;
  }

  add(item: ItemDef): AddResult {
    switch (item.kind) {
      case 'passive':
        if (this.passives.includes(item.id)) return { added: false };
        this.passives.push(item.id);
        return { added: true };
      case 'active': {
        if (!item.active) throw new Error(`Active item "${item.id}" has no active definition`);
        const dropped = this.active?.id;
        this.active = { id: item.id, charge: item.active.recharge, max: item.active.recharge };
        return { added: true, dropped };
      }
      case 'consumable': {
        const dropped = this.consumable ?? undefined;
        this.consumable = item.id;
        return { added: true, dropped };
      }
      case 'weapon':
        this.weapon = item.id;
        return { added: true };
    }
  }

  /** Adds charge after a room clear. Returns true if the active item just became ready. */
  chargeActive(rooms = 1): boolean {
    if (!this.active || this.active.charge >= this.active.max) return false;
    this.active.charge = Math.min(this.active.max, this.active.charge + rooms);
    return this.active.charge >= this.active.max;
  }

  activeReady(): boolean {
    return !!this.active && this.active.charge >= this.active.max;
  }

  spendActive(): void {
    if (this.active) this.active.charge = 0;
  }

  takeConsumable(): ContentId | null {
    const id = this.consumable;
    this.consumable = null;
    return id;
  }
}
