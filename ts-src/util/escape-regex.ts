export function escapeRegex(_string: string) : string {
  return _string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}
