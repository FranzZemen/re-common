import {ExecutionContextI, LoggerAdapter} from '@franzzemen/app-utility';
import {RuleElementModuleReference} from '../rule-element-ref/rule-element-reference';
import {HasRefName} from '../util/has-ref-name';
import {Options} from './options';
import {ScopedFactory} from './scoped-factory';

export class Scope extends Map<string, any> {
  public static ParentScope = 'ParentScope';
  public static ChildScopes = 'ChildScopes';

  constructor(options?: Options, ec?: ExecutionContextI) {
    super();
  }

  getScopedFactory<C>(refName: string, factoryKey: string, searchParent = true, ec?: ExecutionContextI): C {
    const factory: ScopedFactory<C> = this.get(factoryKey);
    const c = factory.getRegistered(refName, ec);
    if (c) {
      return c;
    } else if (searchParent) {
      const parentScope = this.get(Scope.ParentScope) as Scope;
      if (parentScope) {
        return parentScope.getScopedFactory<C>(refName, factoryKey, searchParent, ec);
      }
    }
    return undefined;
  }


  add<C>(items: RuleElementModuleReference[], factoryKey: string, override = false, overrideDown = false, ec?: ExecutionContextI) {
    const log = new LoggerAdapter(ec, 'rules-engine', 'scope-functions', 'add');
    if (items?.length > 0) {
      const factory: ScopedFactory<C> = this.get(factoryKey);
      items.forEach(item => {
        if (override) {
          // Clear anscestors, adding the data type to the furthest ancestor
          if (this.overrideScopes(item, factoryKey, ec)) {
            // IF ancestor existed (overrideDataType = true), then clear this dataFactory
            if (factory.hasRegistered(item.refName, ec)) {
              factory.unregister(item.refName, ec);
            }
          } else {
            // If no ancestor existed, then just set the data type at this scope level
            factory.register(item, true, ec);
          }
        } else {
          // If the override flag is false, then set at this level, but don't override what's in the factory
          factory.register(item, false, ec);
        }
        if (overrideDown) {
          // Remove all child hierarchy data types
          this.recurseRemoveChildItems<C>([item.refName], factoryKey, ec);
        }
      });
    }
  }

  overrideScopes<C>(item: RuleElementModuleReference, factoryKey: string, ec?: ExecutionContextI): boolean {
    // Start at the top of the stack
    let height = this.getScopeDepth(ec);
    let furthestAncestor: Map<string, any>;
    while (height > 0) {
      const ancestor = this.getParentAtHeight(height, ec);
      const ancestorFactory: ScopedFactory<C> = ancestor.get(factoryKey);
      if (ancestorFactory.hasRegistered(item.refName, ec)) {
        if (!furthestAncestor) {
          furthestAncestor = ancestor;
        }
        ancestorFactory.unregister(item.refName, ec);
      }
      height--;
    }
    if (furthestAncestor) {
      const ancestorFactory: ScopedFactory<C> = furthestAncestor.get(factoryKey);
      ancestorFactory.register(item, true, ec);
      return true;
    } else {
      return false;
    }
  }


  remove<C extends HasRefName>(refNames: string [], factoryKey: string, override = false, overrideDown = false, ec?: ExecutionContextI) {
    let scope = this;
    do {
      scope.removeInScope(refNames, factoryKey, ec);
    } while (override && (scope = scope.get(Scope.ParentScope)));
    if (overrideDown) {
      this.recurseRemoveChildItems(refNames, factoryKey, ec);
    }
  }

  recurseRemoveChildItems<C>(refNames: string[], factoryKey: string, ec) {
    (this.get(Scope.ChildScopes) as Scope[]).forEach(childScope => {
      childScope.removeInScope<C>(refNames, factoryKey, ec);
      childScope.recurseRemoveChildItems<C>(refNames, factoryKey, ec);
    });
  }

  removeInScope<C>(refNames: string[], factoryKey: string, ec: ExecutionContextI) {
    const factory: ScopedFactory<C> = this.get(factoryKey);
    refNames.forEach(refName => {
      if (factory.hasRegistered(refName, ec)) {
        factory.unregister(refName, ec);
      }
    });
  }


  getScopeDepth(execContext?: ExecutionContextI): number {
    let depth = 0;
    let scope = this;
    while ((scope = scope.get(Scope.ParentScope)) !== undefined) {
      depth++;
    }
    return depth;
  }

  getParentAtHeight(height: number, execContext?: ExecutionContextI): Scope {
    let parent: Scope;
    for(let i = 0; i < height; i++) {
      if(i === 0) {
        parent = this.get(Scope.ParentScope);
      } else {
        parent = parent.get(Scope.ParentScope);
      }
      if (!parent) break;
    }
    return parent;
  }

}
