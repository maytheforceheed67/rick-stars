import type { ContentId, StatusDef, StatusFlags } from '../types';
import type { StatModifiers } from './stats';

export interface ActiveStatus {
  def: StatusDef;
  /** Seconds or rooms left, depending on the duration kind (Infinity for act/manual). */
  remaining: number;
}

export interface StatusChange {
  expired: ContentId;
  /** Follow-up status applied because the expired one had `thenApply`. */
  applied?: ContentId;
}

/** Tracks the player's status effects. Pure logic; the run scene ticks it. */
export class StatusManager {
  private readonly active = new Map<ContentId, ActiveStatus>();

  constructor(private readonly lookup: (id: ContentId) => StatusDef | undefined) {}

  /** Adds a status, or refreshes its duration if it's already active. */
  add(id: ContentId): boolean {
    const def = this.lookup(id);
    if (!def) throw new Error(`Unknown status "${id}"`);
    const d = def.duration;
    const remaining = d.kind === 'seconds' || d.kind === 'rooms' ? d.value : Infinity;
    const existing = this.active.get(id);
    if (existing) {
      existing.remaining = Math.max(existing.remaining, remaining);
      return false;
    }
    this.active.set(id, { def, remaining });
    return true;
  }

  remove(id: ContentId): boolean {
    return this.active.delete(id);
  }

  has(id: ContentId): boolean {
    return this.active.has(id);
  }

  list(): ActiveStatus[] {
    return [...this.active.values()];
  }

  modifiers(): StatModifiers[] {
    return this.list()
      .map((s) => s.def.stats)
      .filter((m): m is StatModifiers => !!m);
  }

  flags(): StatusFlags {
    const out: StatusFlags = {};
    for (const s of this.active.values()) {
      const f = s.def.flags;
      if (!f) continue;
      out.noDash ||= !!f.noDash;
      out.wobblyMove ||= !!f.wobblyMove;
      out.wobblyAim ||= !!f.wobblyAim;
      out.scrambled ||= !!f.scrambled;
    }
    return out;
  }

  /** Advances seconds-based statuses. */
  tick(seconds: number): StatusChange[] {
    return this.expire('seconds', seconds);
  }

  /** Counts down rooms-based statuses. */
  roomCleared(): StatusChange[] {
    return this.expire('rooms', 1);
  }

  /** Removes statuses that last until the end of the act. */
  actEnded(): ContentId[] {
    const removed: ContentId[] = [];
    for (const [id, s] of this.active) {
      if (s.def.duration.kind === 'act' || s.def.endsWithAct) {
        this.active.delete(id);
        removed.push(id);
      }
    }
    return removed;
  }

  clear(): void {
    this.active.clear();
  }

  private expire(kind: 'seconds' | 'rooms', amount: number): StatusChange[] {
    const changes: StatusChange[] = [];
    for (const [id, s] of [...this.active]) {
      if (s.def.duration.kind !== kind) continue;
      s.remaining -= amount;
      if (s.remaining > 0) continue;
      this.active.delete(id);
      const change: StatusChange = { expired: id };
      if (s.def.thenApply) {
        this.add(s.def.thenApply);
        change.applied = s.def.thenApply;
      }
      changes.push(change);
    }
    return changes;
  }
}
