export function reverseEnumerationToSet (theEnum): Set<string> {
  const stringSet = new Set<string>();
  Object.keys(theEnum).forEach(key => {
    stringSet.add(key);
  });
  return stringSet;
}

export function isEnumeratedType<T> (enumeratedType: T | string | any, reverseEnumeratedSet: Set<string>): enumeratedType is T {
  if(enumeratedType && typeof enumeratedType === 'string' && reverseEnumeratedSet) {
    return reverseEnumeratedSet.has(enumeratedType);
  }
  return false;
}



