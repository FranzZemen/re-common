export interface Options {
  name?: string,
  throwOnAsync?: boolean;
}

export function _mergeOptions(target: Options, source: Options, mergeInto = true): Options {
  let _target: Options = mergeInto ? target : {};
  _target.name = source.name ? source.name : target.name;
  _target.throwOnAsync = (source.throwOnAsync !== undefined) ? source.throwOnAsync : target.throwOnAsync;
  return _target;
}

export const defaultOptions: Options = {
  throwOnAsync: false
}

