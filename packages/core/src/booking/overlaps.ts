export interface Interval {
  start: Date;
  end: Date;
}

/** Due intervalli semiaperti [start, end) si sovrappongono. Coerente con tstzrange di Postgres. */
export function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}

export interface Booking<T = string> extends Interval {
  id: string;
  resourceId: T;
}

/**
 * Anteprima lato interfaccia: prenotazioni esistenti sulla stessa risorsa che confliggono.
 * La decisione finale spetta sempre al vincolo EXCLUDE del database.
 */
export function findConflicts<T>(candidate: Booking<T>, existing: Booking<T>[]): Booking<T>[] {
  return existing.filter(
    (e) => e.id !== candidate.id && e.resourceId === candidate.resourceId && overlaps(candidate, e),
  );
}
