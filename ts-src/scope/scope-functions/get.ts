import {ExecutionContextI} from '@franzzemen/app-utility';
import {ScopeKey} from '../scope-key';
import * as ScopeKeys from '../scope-key';
import {ScopedFactory} from '../scoped-factory';

export function get<C>(scope: Map<string, any>, refName: string, factoryKey: ScopeKey, searchParent = true, ec?: ExecutionContextI) : C {
  const factory: ScopedFactory<C> = scope.get(factoryKey);
  const c = factory.getRegistered(refName, ec);
  if(c) {
    return c;
  } else if (searchParent) {
    const parentScope = scope.get(ScopeKeys.ParentScope) as Map<string, any>;
    if(parentScope) {
      return get<C>(parentScope, refName, factoryKey, searchParent, ec);
    }
  }
  return undefined;
}


