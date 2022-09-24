import {
  ExecutionContextI, Hints,
  LoadPackageType,
  LoggerAdapter, ModuleResolutionAction,
  ModuleResolutionResult,
  ModuleResolver
} from '@franzzemen/app-utility';
import {EnhancedError, logErrorAndReturn, logErrorAndThrow} from '@franzzemen/app-utility/enhanced-error.js';
import {ModuleResolutionSetterInvocation} from '@franzzemen/app-utility/module-resolver.js';
import {isPromise} from 'node:util/types';
import {v4} from 'uuid';
import {RuleElementFactory} from '../rule-element-ref/rule-element-factory.js';
import {RuleElementInstanceReference, RuleElementReference} from '../rule-element-ref/rule-element-reference.js';
import {HasRefName} from '../util/has-ref-name.js';
import {Options} from './options.js';
import {ScopedFactory} from './scoped-factory.js';


export class Scope extends Map<string, any> {
  public static ParentScope = 'ParentScope';
  public static ChildScopes = 'ChildScopes';
  public static ScopeName = 'ScopeName';

  public scopeName: string;
  public throwOnAsync = false;
  private moduleResolver = new ModuleResolver();

  constructor(protected options?: Options, parentScope?: Scope, ec?: ExecutionContextI) {
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
    if(options?.throwOnAsync !== undefined) {
      this.throwOnAsync = options.throwOnAsync;
    }
  }

  parseHints(near: string, prefix: string, ec?: ExecutionContextI) : [string, Hints] {
    return Hints.parseHints(this.moduleResolver, near, prefix, ec);
  }

  getRuleElementItem<C>(refName: string, factoryKey: string, searchParent = true, ec?: ExecutionContextI): C {
    return this.getScopedFactoryItem(refName, factoryKey, searchParent, ec);
  }

  getScopedFactoryItem<C>(refName: string, factoryKey: string, searchParent = true, ec?: ExecutionContextI): C {
    const factory: ScopedFactory<C> = this.get(factoryKey);
    const c = factory.getRegistered(refName, ec);
    if (c) {
      return c;
    } else if (searchParent) {
      const parentScope = this.get(Scope.ParentScope) as Scope;
      if (parentScope) {
        return parentScope.getScopedFactoryItem<C>(refName, factoryKey, searchParent, ec);
      }
    }
    return undefined;
  }


  /**
   * Module Resolver setter
   * @param refName
   * @param instance
   * @param result
   * @param factory
   * @param ec
   */
  addRuleElementReferenceSetter: ModuleResolutionSetterInvocation = (refName: string, instance: any, result:ModuleResolutionResult, factory: RuleElementFactory<any>, ec) => {
    if(instance === undefined || result.resolution.loader.module === undefined) {
      const log = new LoggerAdapter(ec, 're-common', 'scope', 'addRuleElementReference');
      log.warn({refName, instance, result, factory}, 'No instance or no module');
      logErrorAndThrow(new EnhancedError(`No instance or no module for refName ${refName}`));
    }
    factory.register({instanceRef: {refName, instance}, moduleRef: {refName, module: result.resolution.loader.module}});
    return true;
  }


  addRuleElementReferenceItem<C>(ruleElementRef: RuleElementReference<C>, factoryKey: string | RuleElementFactory<any>, action?: ModuleResolutionAction, ec?: ExecutionContextI): C {
    const log = new LoggerAdapter(ec, 're-common', 'scope', 'addRuleElementReferenceItem');
    let factory: RuleElementFactory<any>;
    if(typeof factoryKey === 'string') {
      factory = this.get(factoryKey) as RuleElementFactory<any>;
    } else {
      factory = factoryKey;
    }
    if (ruleElementRef.instanceRef === undefined) {
      if (ruleElementRef.moduleRef === undefined) {
        logErrorAndThrow(new EnhancedError('Undefined instanceRef and moduleRef'), log, ec);
      } else {
        this.moduleResolver.add({
          refName: ruleElementRef.moduleRef.refName,
          loader: {
            module: ruleElementRef.moduleRef.module,
            loadPackageType: LoadPackageType.package
          },
          setter: {
            ownerIsObject: true,
            objectRef: this,
            setterFunction: 'addRuleElementReferenceSetter',
            paramsArray: [factory, ec]
          },
          action
        });
        return undefined;
      }
    } else {
      return factory.register(ruleElementRef,ec);
    }
  }
  /**
   * For pure instances this will not require scope.resolve(); For modules or mixed it will.
   * @param ruleElementRefs
   * @param factoryKey
   * @param actions
   * @param ec
   */
  addRuleElementReferenceItems<C>(ruleElementRefs: RuleElementReference<C>[], factoryKey: string | RuleElementFactory<any>, actions?: ModuleResolutionAction[], ec?: ExecutionContextI): C[] {
    const log = new LoggerAdapter(ec, 're-common', 'scope', 'addRuleElementReferenceItems');
    let factory: RuleElementFactory<any>;
    if(typeof factoryKey === 'string') {
      factory = this.get(factoryKey) as RuleElementFactory<any>;
    } else {
      factory = factoryKey;
    }
    if(ruleElementRefs === undefined) {
      logErrorAndThrow(new EnhancedError('Undefined RuleElementReference<>[]'), log, ec);
    } else {
      const instances: C[] = [];
      ruleElementRefs.forEach((ruleElementRef, ndx) => {
        instances.push(this.addRuleElementReferenceItem(ruleElementRef, factory, actions ? actions[ndx] : undefined, ec))
      });
      return instances;
    }
  }

  /**
   * Resolves this scope and down, working from the lowest scope up, and iterating backward in the child array to ensure
   * the "oldest" scope handled last.
   * @param scope
   * @param ec
   */
  static resolve(scope: Scope, ec?: ExecutionContextI): true | Promise<true> {
    const childScopes = scope.get(Scope.ChildScopes) as Scope[];
    if(childScopes && childScopes.length > 0) {
      let reverse = childScopes.filter(child => true);
      reverse.reverse();
      let async = false;
      const promises: (true | Promise<true>)[] = [];
      reverse.forEach(child => {
        const trueOrPromise = Scope.resolve(child, ec);
        if(isPromise(trueOrPromise)) {
          async = true;
        }
        promises.push(trueOrPromise);
      })
      if(async) {
        return Promise.all(promises)
          .then((truVals) => {
            return Scope.resolveLocal(scope, ec);
          });
      } else {
        return Scope.resolveLocal(scope, ec);
      }
    } else {
      return Scope.resolveLocal(scope, ec);
    }
  }

  private static resolveLocal(scope: Scope, ec?: ExecutionContextI) : true | Promise<true> {
    if (scope.moduleResolver.hasPendingResolutions()) {
      const resultsOrPromises = scope.moduleResolver.resolve(ec);
      if (isPromise(resultsOrPromises)) {
        return resultsOrPromises
          .then(resolutions => {
            const someErrors = ModuleResolver.resolutionsHaveErrors(resolutions);
            if (someErrors) {
              const log = new LoggerAdapter(ec, 're-common', 'scope', 'resolveLocal');
              log.warn({scope}, 'Errors resolving modules');
              throw logErrorAndReturn(new EnhancedError('Errors resolving modules'));
            } else {
              scope.moduleResolver.clear();
              return true;
            }
          });
      } else {
        return true;
      }
    } else {
      return true;
    }
  }


  removeScopedFactoryItem<C extends HasRefName>(refNames: string [], factoryKey: string, override = false, overrideDown = false, ec?: ExecutionContextI) {
    let scope = this;
    do {
      scope.removeScopedFactoryItemsInScope(refNames, factoryKey, ec);
    } while (override && (scope = scope.get(Scope.ParentScope)));
    if (overrideDown) {
      this.recurseRemoveScopedFactoryChildItems(refNames, factoryKey, ec);
    }
  }

  private recurseRemoveScopedFactoryChildItems<C>(refNames: string[], factoryKey: string, ec) {
    if(this.get(Scope.ChildScopes) == undefined) {
      return;
    }
    (this.get(Scope.ChildScopes) as Scope[]).forEach(childScope => {
      childScope.removeScopedFactoryItemsInScope<C>(refNames, factoryKey, ec);
      childScope.recurseRemoveScopedFactoryChildItems<C>(refNames, factoryKey, ec);
    });
  }

  private removeScopedFactoryItemsInScope<C>(refNames: string[], factoryKey: string, ec: ExecutionContextI) {
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

  hasScopedFactoryItem<C>(refName: string, factoryKey: string, ec?: ExecutionContextI): boolean {
    const factory = this.get(factoryKey);
    if(factory.hasRegistered(refName, ec)) {
      return true;
    } else {
      const parentScope = this.get(Scope.ParentScope) as Scope;
      if (parentScope) {
        return parentScope.hasScopedFactoryItem<C>(refName, factoryKey, ec);
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
            logErrorAndThrow(err, log, ec);
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
