 import {ExecutionContextI, LoggerAdapter, ModuleResolution} from '@franzzemen/app-utility';
import {isPromise} from 'node:util/types';
import {v4} from 'uuid';
import {
  isRuleElementModuleReference,
  RuleElementInstanceReference,
  RuleElementModuleReference
} from '../rule-element-ref/rule-element-reference.js';
import {HasRefName} from '../util/has-ref-name.js';
import {Options} from './options.js';
import {ScopedFactory} from './scoped-factory.js';


export class Scope extends Map<string, any> {
  public static ParentScope = 'ParentScope';
  public static ChildScopes = 'ChildScopes';
  public static ScopeName = 'ScopeName';


  public scopeName: string;

  constructor(options?: Options, parentScope?: Scope, ec?: ExecutionContextI) {
    super();
    this.scopeName = this.constructor.name + '-' + v4();
    this.set(Scope.ParentScope, parentScope);
    if (parentScope) {
      let childScopes: Scope [] = parentScope.get(Scope.ChildScopes);
      if(!childScopes) {
        childScopes = [];
        parentScope.set(Scope.ChildScopes, childScopes);
      }
      childScopes.push(this);
    }
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

  private async _addRuleElementAsync<C>(items: (RuleElementModuleReference | RuleElementInstanceReference<C>)[], factoryKey: string, override = false, overrideDown = false, ec?: ExecutionContextI): Promise<void> {
    const factory: ScopedFactory<C> = this.get(factoryKey);
    for(const item of items) {
      if (override) {
        // Clear anscestors, adding the data type to the furthest ancestor
        if (this.overrideRuleElementInScopes(item, factoryKey, ec)) {
          // IF ancestor existed (overrideDataType = true), then clear this dataFactory
          if (factory.hasRegistered(item.refName, ec)) {
            factory.unregister(item.refName, ec);
          }
        } else {
          // If no ancestor existed, then just set the data type at this scope level
          // Ignore result, but wait for promise to settle, so order is kept.
          await factory.register(item, true, undefined, undefined, ec);
        }
      } else {
        // If the override flag is false, then set at this level, but don't override what's in the factory
        await factory.register(item, false, undefined, undefined, ec);
      }
      if (overrideDown) {
        // Remove all child hierarchy data types
        this.recurseRemoveRuleElementChildItems<C>([item.refName], factoryKey, ec);
      }
    }
  }

  // TODO: check function
  // TODO:  Should we allow to add instances of an item?
  addRuleElement<C>(items: (RuleElementModuleReference | RuleElementInstanceReference<C>)[], factoryKey: string, override = false, overrideDown = false, ec?: ExecutionContextI): void | Promise<void> {
    const log = new LoggerAdapter(ec, 'rules-engine', 'scope-functions', 'add');
    if (items?.length > 0) {

      // Verify if any modules will cause async processing.
      const hasAsync = items.some(item => isRuleElementModuleReference(item) && item.module.moduleResolution === ModuleResolution.es);
      if (hasAsync) {
        this._addRuleElementAsync(items, factoryKey, override, overrideDown, ec);
      } else {
        const factory: ScopedFactory<C> = this.get(factoryKey);
        items.forEach(item => {
          if (override) {
            // Clear anscestors, adding the data type to the furthest ancestor
            if (this.overrideRuleElementInScopes(item, factoryKey, ec)) {
              // IF ancestor existed (overrideDataType = true), then clear this dataFactory
              if (factory.hasRegistered(item.refName, ec)) {
                factory.unregister(item.refName, ec);
              }
            } else {
              // If no ancestor existed, then just set the data type at this scope level
              // TODO: Factory. register can return a Promise, and we should be passing a check function? (understanding that items may have schemas...)
              factory.register(item, true, undefined, undefined, ec);
            }
          } else {
            // If the override flag is false, then set at this level, but don't override what's in the factory
            factory.register(item, false, undefined, undefined, ec);
          }
          if (overrideDown) {
            // Remove all child hierarchy data types
            this.recurseRemoveRuleElementChildItems<C>([item.refName], factoryKey, ec);
          }
        });
      }
    }
  }

  // TODO: ? Check function?
  overrideRuleElementInScopes<C>(item: (RuleElementModuleReference | RuleElementInstanceReference<C>), factoryKey: string, ec?: ExecutionContextI): boolean | Promise<boolean> {
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
      const valueOrPromise = ancestorFactory.register(item, true, undefined, undefined, ec);
      if(isPromise(valueOrPromise)) {
        return valueOrPromise
          .then(value => {
            return true;
          }, err=> {
            const log = new LoggerAdapter(ec, 're-common', 'scope', 'overrideScopes');
            log.error(err);
            throw err;
          });
      } else {
        return true;
      }
    } else {
      return false;
    }
  }


  removeRuleElements<C extends HasRefName>(refNames: string [], factoryKey: string, override = false, overrideDown = false, ec?: ExecutionContextI) {
    let scope = this;
    do {
      scope.removeRuleElementsInScope(refNames, factoryKey, ec);
    } while (override && (scope = scope.get(Scope.ParentScope)));
    if (overrideDown) {
      this.recurseRemoveRuleElementChildItems(refNames, factoryKey, ec);
    }
  }

  recurseRemoveRuleElementChildItems<C>(refNames: string[], factoryKey: string, ec) {
    (this.get(Scope.ChildScopes) as Scope[]).forEach(childScope => {
      childScope.removeRuleElementsInScope<C>(refNames, factoryKey, ec);
      childScope.recurseRemoveRuleElementChildItems<C>(refNames, factoryKey, ec);
    });
  }

  removeRuleElementsInScope<C>(refNames: string[], factoryKey: string, ec: ExecutionContextI) {
    const factory: ScopedFactory<C> = this.get(factoryKey);
    refNames.forEach(refName => {
      if (factory.hasRegistered(refName, ec)) {
        factory.unregister(refName, ec);
      }
    });
  }

  /**
   * Get the dept of the scope
   * @param execContext
   */
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

  hasFactory<C>(refName: string, factoryKey: string, ec?: ExecutionContextI): boolean {
    const factory = this.get(factoryKey);
    if(factory.hasRegistered(refName, ec)) {
      return true;
    } else {
      const parentScope = this.get(Scope.ParentScope) as Scope;
      if (parentScope) {
        return parentScope.hasFactory<C>(refName, factoryKey, ec);
      }
    }
    return false;
  }

  // Are two scopes (reasonably) the same?  This is not fully exact.
  // It purposefully does not force the two scopes or their contents to be of the same instance
  isSameScope(o: Scope): boolean {
    if(this === o) {
      return true;
    }

    if(this.typeOfScope() === o.typeOfScope() && this.size == o.size) {
      let iterator = this.keys();
      let match = true;
      // For now, we just match all the keys...
      // TODO: compare values?
      for(let key of iterator) {
        if(!o.has(key)) {
          match = false;
          break;
        }
      }
      return match;
    } else {
      return false;
    }
  }

  typeOfScope(): string {
    return this.constructor.name;
  }

  /**
   * For this scope, place it under a new parentScope.  Old parent scope will lose this 'child'
   * @param scope
   * @param parentScope
   * @param ec
   */
  reParent(parentScope: Scope, ec?: ExecutionContextI) {
    if(parentScope) {
      const existingParent = this.get(Scope.ParentScope);
      if(existingParent) {
        const parentChildScopes: Scope[] = existingParent.get(Scope.ChildScopes);
        if(parentChildScopes) {
          const thisScopeNdx = parentChildScopes.findIndex(item => item.scopeName === this.scopeName);
          if(thisScopeNdx >= 0) {
            parentChildScopes.splice(thisScopeNdx,1);
          } else {
            const log = new LoggerAdapter(ec, 're-common', 'scope', 'reParent');
            const err = new Error ('Scope inconsistency...child scope not found in parent scope when re-parenting');
            log.error(err);
            throw err;
          }
        }
      }
      this.set(Scope.ParentScope, parentScope);
      let parentChildScopes: Scope[] = parentScope.get(Scope.ChildScopes);
      if(!parentChildScopes) {
        parentChildScopes = [];
        parentScope.set(Scope.ChildScopes, parentChildScopes);
      }
      parentChildScopes.push(this);
    }
  }
}
