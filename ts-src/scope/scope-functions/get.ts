import {ExecutionContextI} from '@franzzemen/app-utility';
import {ParentScope} from '../scope-keys';
import {ScopedFactory} from '../scoped-factory';

export function get<C>(scope: Map<string, any>, refName: string, factoryKey: string, searchParent = true, ec?: ExecutionContextI) : C {
  const factory: ScopedFactory<C> = scope.get(factoryKey);
  const c = factory.getRegistered(refName, ec);
  if(c) {
    return c;
  } else if (searchParent) {
    const parentScope = scope.get(ParentScope) as Map<string, any>;
    if(parentScope) {
      return get<C>(parentScope, refName, factoryKey, searchParent, ec);
    }
  }
  return undefined;
}


