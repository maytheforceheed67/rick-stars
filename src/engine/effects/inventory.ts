import type { ContentId, ItemDef } from '../types';

export interface ActiveSlot {
  id: ContentId;
  charge: number;
  max: number;
}

export interface Dropped {
  id: ContentId;
  /** An active item keeps its charge on the floor, so swapping back can't recharge it. */
  charge?: number;
}

export interface AddResult {
  /** False when the item was already owned (passives don't stack). */
  added: boolean;
  /** Item that was swapped out and should be dropped back on the floor. */
  dropped?: Dropped;
}

/** What the player is carrying. Pure logic; items are looked up by the caller. */
export class Inventory {
  /** Each act hands Morty its own story weapon; null while he has nothing to fight with. */
  weapon: ContentId | null;
  readonly passives: ContentId[] = [];
  active: ActiveSlot | null = null;
  consumable: ContentId | null = null;

  constructor(weapon: ContentId | null = null) {
    this.weapon = weapon;
  }

  /** Items that count for hooks, stats and synergies (consumables don't until used). */
  owned(): ContentId[] {
    const out = this.weapon ? [this.weapon, ...this.passives] : [...this.passives];
    if (this.active) out.push(this.active.id);
    return out;
  }

  has(id: ContentId): boolean {
    return this.weapon === id || this.passives.includes(id) || this.active?.id === id || this.consumable === id;
  }

  /** The item this one would replace, if picking it up is a swap. */
  swapsOut(item: ItemDef): ContentId | null {
    if (item.kind === 'active' && this.active && this.active.id !== item.id) return this.active.id;
    if (item.kind === 'consumable' && this.consumable && this.consumable !== item.id) return this.consumable;
    return null;
  }

  /**
   * Adds an item. A fresh active item comes fully charged; one that was dropped earlier passes
   * its remaining `charge` back in.
   */
  add(item: ItemDef, opts: { charge?: number } = {}): AddResult {
    switch (item.kind) {
      case 'passive':
        if (this.passives.includes(item.id)) return { added: false };
        this.passives.push(item.id);
        return { added: true };
      case 'active': {
        if (!item.active) throw new Error(`Active item "${item.id}" has no active definition`);
        const old = this.active;
        const max = item.active.recharge;
        this.active = { id: item.id, charge: Math.max(0, Math.min(max, opts.charge ?? max)), max };
        return { added: true, dropped: old ? { id: old.id, charge: old.charge } : undefined };
      }
      case 'consumable': {
        const dropped = this.consumable ? { id: this.consumable } : undefined;
        this.consumable = item.id;
        return { added: true, dropped };
      }
      case 'weapon':
        // A new story weapon replaces the old one; items that change shots apply to either.
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
