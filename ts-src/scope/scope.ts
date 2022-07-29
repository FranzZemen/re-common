import {ExecutionContextI} from '@franzzemen/app-utility';
import {ScopedFactory} from './scoped-factory';

export class Scope extends Map<string, any> {
  public static ParentScope = 'ParentScope';

  constructor() {
    super();
  }

  getScopedFactory<C>(scope: Map<string, any>, refName: string, factoryKey: string, searchParent = true, ec?: ExecutionContextI) : C {
    const factory: ScopedFactory<C> = scope.get(factoryKey);
    const c = factory.getRegistered(refName, ec);
    if(c) {
      return c;
    } else if (searchParent) {
      const parentScope = scope.get(Scope.ParentScope) as Map<string, any>;
      if(parentScope) {
        return this.getScopedFactory<C>(parentScope, refName, factoryKey, searchParent, ec);
      }
    }
    return undefined;
  }
}
