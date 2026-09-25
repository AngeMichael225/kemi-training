export type SnapshotWriter<T> = (snapshot: T) => Promise<void>;

export interface SessionPersistence<T> {
  submit(snapshot: T): Promise<void>;
  whenIdle(): Promise<void>;
}

/**
 * Serializes snapshot writes in submit order.
 * A snapshot submitted earlier cannot become the durable value after a later one.
 */
export function createSessionPersistence<T>(write: SnapshotWriter<T>): SessionPersistence<T> {
  let chain: Promise<void> = Promise.resolve();

  return {
    submit(snapshot: T): Promise<void> {
      const writeThis = chain.then(() => write(snapshot));
      chain = writeThis.then(
        () => undefined,
        () => undefined,
      );
      return writeThis;
    },
    whenIdle(): Promise<void> {
      return chain;
    },
  };
}

export interface SessionStore<T> {
  readonly current: T;
  update(mutator: (current: T) => T): Promise<void>;
  whenIdle(): Promise<void>;
}

interface SessionStoreOptions<T extends { updatedAt: string; status: "active" | "completed" }> {
  initial: T;
  write: SnapshotWriter<T>;
  now?: () => string;
}

function createMonotonicClock(): () => string {
  let last = 0;
  return () => {
    const ms = Math.max(Date.now(), last + 1);
    last = ms;
    return new Date(ms).toISOString();
  };
}

/**
 * Applies each mutator to the latest logical snapshot, then enqueues that result.
 * A completed session cannot be reopened as active by a later mutator.
 */
export function createSessionStore<T extends { updatedAt: string; status: "active" | "completed" }>(
  options: SessionStoreOptions<T>,
): SessionStore<T> {
  let current = options.initial;
  const persistence = createSessionPersistence(options.write);
  const now = options.now ?? createMonotonicClock();

  return {
    get current() {
      return current;
    },
    update(mutator: (current: T) => T): Promise<void> {
      const drafted = mutator(current);
      if (current.status === "completed" && drafted.status !== "completed") {
        return Promise.resolve();
      }
      current = { ...drafted, updatedAt: now() };
      return persistence.submit(current);
    },
    whenIdle(): Promise<void> {
      return persistence.whenIdle();
    },
  };
}
