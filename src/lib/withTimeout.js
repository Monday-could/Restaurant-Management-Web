/**
 * Resolves/rejects with `promise`, or rejects after `ms` if still pending.
 * @template T
 * @param {Promise<T>} promise
 * @param {number} ms
 * @param {string} [label]
 * @returns {Promise<T>}
 */
export function withTimeout(promise, ms, label = "Request") {
  if (!(ms > 0)) return promise;
  return new Promise((resolve, reject) => {
    const tid = setTimeout(() => {
      reject(Object.assign(new Error(`${label} timed out after ${ms}ms`), { code: "TIMEOUT" }));
    }, ms);
    promise.then(
      (v) => {
        clearTimeout(tid);
        resolve(v);
      },
      (e) => {
        clearTimeout(tid);
        reject(e);
      },
    );
  });
}
