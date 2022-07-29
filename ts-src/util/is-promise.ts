export function isPromise<T>(ref: T | Promise<T>): ref is Promise<T> {
  if(typeof ref === 'object') {
    return 'then' in ref;
  }
  return false;
}
