export interface Deferred<T = void> {
  resolve(v: T): void;
  reject(e: any): void;
  promise: Promise<T>;
}

export function makeDeferred<T = void> (): Deferred<T> {
  let resolve!: (v: T) => void
  let reject!: (e: any) => void
  const promise = new Promise<T>((_resolve, _reject) => {
    resolve = _resolve
    reject = _reject
  })
  return {
    resolve,
    reject,
    promise
  }
}
