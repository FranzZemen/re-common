import {ExecutionContextI} from '@franzzemen/app-utility';
import {ScopedFactory} from './scoped-factory';

export class Scope extends Map<string, any> {
  public static ParentScope = 'ParentScope';

  constructor(ec?: ExecutionContextI) {
    super();
  }

  getScopedFactory<C>(refName: string, factoryKey: string, searchParent = true, ec?: ExecutionContextI) : C {
    const factory: ScopedFactory<C> = this.get(factoryKey);
    const c = factory.getRegistered(refName, ec);
    if(c) {
      return c;
    } else if (searchParent) {
      const parentScope = this.get(Scope.ParentScope) as Scope;
      if(parentScope) {
        return parentScope.getScopedFactory<C>(refName, factoryKey, searchParent, ec);
      }
    }
    return undefined;
  }
}
