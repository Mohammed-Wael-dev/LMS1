type Task = () => Promise<any> | any;

export function makeKeyedDebouncer(wait = 400) {
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  const latestTask = new Map<string, Task>();
  const inflight = new Map<string, Promise<any>>();

  return function schedule(key: string, task: Task): Promise<any> {
    latestTask.set(key, task);
    if (timers.has(key)) clearTimeout(timers.get(key)!);

    return new Promise((resolve, reject) => {
      const t = setTimeout(async () => {
        timers.delete(key);
        const run = latestTask.get(key);
        latestTask.delete(key);
        if (!run) return resolve(undefined);

        // If previous still inflight, chain after it
        const prev = inflight.get(key) ?? Promise.resolve();
        const exec = prev.then(run);
        inflight.set(key, exec);
        try {
          const res = await exec;
          if (inflight.get(key) === exec) inflight.delete(key);
          resolve(res);
        } catch (e) {
          if (inflight.get(key) === exec) inflight.delete(key);
          reject(e);
        }
      }, wait);
      timers.set(key, t);
    });
  };
}
