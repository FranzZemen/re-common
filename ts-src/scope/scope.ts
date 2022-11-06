import {EnhancedError, logErrorAndReturn, logErrorAndThrow} from '@franzzemen/enhanced-error';
import {Hints} from '@franzzemen/hints';
import {LogExecutionContext, LoggerAdapter} from '@franzzemen/logger-adapter';
import {
  LoadPackageType,
  ModuleResolutionAction,
  ModuleResolutionResult,
  ModuleResolutionSetterInvocation,
  ModuleResolver
} from '@franzzemen/module-resolver';
import {isPromise} from 'node:util/types';
import {v4} from 'uuid';
import {RuleElementFactory} from '../rule-element-ref/rule-element-factory.js';
import {RuleElementReference} from '../rule-element-ref/rule-element-reference.js';
import {HasRefName} from '../util/has-ref-name.js';
import {CommonOptions, ReCommon} from './common-execution-context.js';
import {ScopedFactory} from './scoped-factory.js';


export class Scope extends Map<string, any> {
  public static ParentScope = 'ParentScope';
  public static ChildScopes = 'ChildScopes';
  public static ScopeName = 'ScopeName';

  public options: CommonOptions;
  public scopeName: string;
  public throwOnAsync = false;
  protected moduleResolver = new ModuleResolver();
  private unsatisfiedRuleElementReferences: [refName: string, factoryName: string][] = [];

  constructor(reOptions?: ReCommon, parentScope?: Scope, ec?: LogExecutionContext) {
    super();
    this.options = reOptions?.common ? reOptions.common : {};
    this.scopeName = this.options.name ? this.options.name : this.constructor.name + '-' + v4();
    this.addParent(parentScope, ec);
    if (this.options.throwOnAsync !== undefined) {
      this.throwOnAsync = this.options.throwOnAsync;
    }
  }

  /**
   * Resolves this scope and down, working from the lowest scope up, and iterating backward in the child array to ensure
   * the "oldest" scope handled last.
   * @param scope
   * @param ec
   */
  static resolve(scope: Scope, ec?: LogExecutionContext): true | Promise<true> {
    const childScopes = scope.get(Scope.ChildScopes) as Scope[];
    if (childScopes && childScopes.length > 0) {
      let reverse = childScopes.filter(child => true);
      reverse.reverse();
      let async = false;
      const promises: (true | Promise<true>)[] = [];
      reverse.forEach(child => {
        const trueOrPromise = Scope.resolve(child, ec);
        if (isPromise(trueOrPromise)) {
          async = true;
        }
        promises.push(trueOrPromise);
      });
      if (async) {
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

  private static clearResolutions(scope): Scope {
    scope.moduleResolver.clear();
    scope.unsatisfiedRuleElementReferences = [];
    return scope;
  }

  private static satisfyUnsatisfiedRuleElementReferences(scope: Scope, ec?: LogExecutionContext): true {
    if (scope.unsatisfiedRuleElementReferences.length > 0) {
      for (let i = scope.unsatisfiedRuleElementReferences.length - 1; i >= 0; i--) {
        let [refName, factoryName] = scope.unsatisfiedRuleElementReferences[i];
        if (scope.hasScopedFactoryItem<any>(refName, factoryName, ec)) {
          scope.unsatisfiedRuleElementReferences.splice(i, 1);
        }
      }
      if (scope.unsatisfiedRuleElementReferences.length > 0) {
        const log = new LoggerAdapter(ec, 're-common', 'scope', 'satisfyUnsatisfiedRuleElementReferences');
        log.warn(scope, `No module found for at least one refName/factoryName`);
        logErrorAndThrow(new EnhancedError(`No module found for at least one refName/factoryName`), log);
      } else {
        return true;
      }
    } else {
      return true;
    }
  }

  private static resolveLocal(scope: Scope, ec?: LogExecutionContext): true | Promise<true> {

    if (scope.moduleResolver.hasPendingResolutions()) {
      const resultsOrPromises = scope.moduleResolver.resolve(ec);
      if (isPromise(resultsOrPromises)) {
        return resultsOrPromises
          .then(resolutions => {
            const someErrors = ModuleResolver.resolutionsHaveErrors(resolutions);
            if (someErrors) {
              const log = new LoggerAdapter(ec, 're-common', 'scope', 'resolveLocal');
              log.warn({scope}, 'Errors resolving modules');
              Scope.clearResolutions(scope);
              throw logErrorAndReturn(new EnhancedError('Errors resolving modules'));
            } else {
              Scope.satisfyUnsatisfiedRuleElementReferences(scope, ec);
              Scope.clearResolutions(scope);
              return true;
            }
          });
      } else {
        Scope.satisfyUnsatisfiedRuleElementReferences(scope, ec);
        Scope.clearResolutions(scope);
        return true;
      }
    } else {
      return true;
    }
  }

  isResolved(): boolean {
    return !this.moduleResolver.hasPendingResolutions();
  }

  addUnsatisfiedRuleElementReference(refName: string, factoryName: string, ec?: LogExecutionContext) {
    const hasUnsatisfiedReference = this.unsatisfiedRuleElementReferences.some(unsatisfiedRuleElementReference => unsatisfiedRuleElementReference[0] === refName && unsatisfiedRuleElementReference[1] === factoryName);
    if (!hasUnsatisfiedReference) {
      this.unsatisfiedRuleElementReferences.push([refName, factoryName]);
    }
  }

  /**
   * Get and consume hint text.  Resolve asynchronous loads normally with resolve (Asynchronous hints will not be immediately
   * available.
   * @param near
   * @param prefix
   * @param ec
   * @return new text minus hints if applicable, and the Hints
   */
  parseHints(near: string, prefix: string, ec?: LogExecutionContext): [string, Hints] {
    return Hints.parseHints(this.moduleResolver, near, prefix, ec);
  }

  getRuleElementItem<C>(refName: string, factoryKey: string, searchParent = true, ec?: LogExecutionContext): C {
    return this.getScopedFactoryItem(refName, factoryKey, searchParent, ec);
  }

  getScopedFactoryItem<C>(refName: string, factoryKey: string, searchParent = true, ec?: LogExecutionContext): C {
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
  addRuleElementReferenceSetter: ModuleResolutionSetterInvocation = (refName: string, instance: any, result: ModuleResolutionResult, factory: string | RuleElementFactory<any>, ec) => {
    if (instance === undefined || result.resolution.loader.module === undefined) {
      const log = new LoggerAdapter(ec, 're-common', 'scope', 'addRuleElementReference');
      log.warn({refName, instance, result, factory}, 'No instance or no module');
      logErrorAndThrow(new EnhancedError(`No instance or no module for refName ${refName}`));
    }
    if (typeof factory === 'string') {
      factory = this.get(factory) as RuleElementFactory<any>;
    }
    factory.register({instanceRef: {refName, instance}, moduleRef: {refName, module: result.resolution.loader.module}});
    return true;
  };

  addRuleElementReferenceItem<C>(ruleElementRef: RuleElementReference<C>, factoryKey: string | RuleElementFactory<any>, action?: ModuleResolutionAction, ec?: LogExecutionContext): C {
    const log = new LoggerAdapter(ec, 're-common', 'scope', 'addRuleElementReferenceItem');
    let factory: RuleElementFactory<any>;
    if (typeof factoryKey === 'string') {
      factory = this.get(factoryKey) as RuleElementFactory<any>;
    } else {
      factory = factoryKey;
    }
    if (ruleElementRef.instanceRef === undefined) {
      this.addRuleElementReferenceItemResolution<C>(ruleElementRef, factoryKey, action, ec);
    } else {
      return factory.register(ruleElementRef, ec);
    }
  }

  /**
   * For pure instances this will not require scope.resolve(); For modules or mixed it will.
   * @param ruleElementRefs
   * @param factoryKey
   * @param actions
   * @param ec
   */
  addRuleElementReferenceItems<C>(ruleElementRefs: RuleElementReference<C>[], factoryKey: string | RuleElementFactory<any>, actions?: ModuleResolutionAction[], ec?: LogExecutionContext): C[] {
    const log = new LoggerAdapter(ec, 're-common', 'scope', 'addRuleElementReferenceItems');
    let factory: RuleElementFactory<any>;
    if (typeof factoryKey === 'string') {
      factory = this.get(factoryKey) as RuleElementFactory<any>;
    } else {
      factory = factoryKey;
    }
    if (ruleElementRefs === undefined) {
      logErrorAndThrow(new EnhancedError('Undefined RuleElementReference<>[]'), log);
    } else {
      const instances: C[] = [];
      ruleElementRefs.forEach((ruleElementRef, ndx) => {
        instances.push(this.addRuleElementReferenceItem(ruleElementRef, factory, actions ? actions[ndx] : undefined, ec));
      });
      return instances;
    }
  }

  removeScopedFactoryItem<C extends HasRefName>(refNames: string [], factoryKey: string, override = false, overrideDown = false, ec?: LogExecutionContext): Scope {
    let scope = this;
    do {
      scope.removeScopedFactoryItemsInScope(refNames, factoryKey, ec);
    } while (override && (scope = scope.get(Scope.ParentScope)));
    if (overrideDown) {
      this.recurseRemoveScopedFactoryChildItems(refNames, factoryKey, ec);
    }
    return this;
  }

  /**
   * Get the dept of the scope
   * @param execContext
   */
  getScopeDepth(execContext?: LogExecutionContext): number {
    let depth = 0;
    let scope = this;
    while ((scope = scope.get(Scope.ParentScope)) !== undefined) {
      depth++;
    }
    return depth;
  }

  getParentAtHeight(height: number, execContext?: LogExecutionContext): Scope {
    let parent: Scope;
    for (let i = 0; i < height; i++) {
      if (i === 0) {
        parent = this.get(Scope.ParentScope);
      } else {
        parent = parent.get(Scope.ParentScope);
      }
      if (!parent) break;
    }
    return parent;
  }

  hasScopedFactoryItem<C>(refName: string, factoryKey: string, ec?: LogExecutionContext): boolean {
    const factory = this.get(factoryKey);
    if (factory.hasRegistered(refName, ec)) {
      return true;
    } else {
      const parentScope = this.get(Scope.ParentScope) as Scope;
      if (parentScope) {
        return parentScope.hasScopedFactoryItem<C>(refName, factoryKey, ec);
      }
    }
    return false;
  }

  // It purposefully does not force the two scopes or their contents to be of the same instance
  isSameScope(o: Scope): boolean {
    if (this === o) {
      return true;
    }

    if (this.typeOfScope() === o.typeOfScope() && this.size == o.size) {
      let iterator = this.keys();
      let match = true;
      // For now, we just match all the keys...
      // TODO: compare values?
      for (let key of iterator) {
        if (!o.has(key)) {
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
   * For this scope, place it under a new parentScope.  Old parent scope will lose this 'child'. 7
   * If this has no parent, then parentScope becomes the new parent Scope.
   ** @param parentScope
   * @param ec
   */
  reParent(parentScope: Scope, ec?: LogExecutionContext): Scope {
    if (parentScope) {
      this.removeParent(ec);
      parentScope.addChild(this, ec);
    }
    return this;
  }

  // Are two scopes (reasonably) the same?  This is not fully exact.

  setRootParent(rootParent: Scope, ec?: LogExecutionContext): Scope {
    let scope: Scope = this;
    let parentScope: Scope;
    while ((parentScope = scope.get(Scope.ParentScope))) {
      scope = parentScope;
    }
    if (scope.get(Scope.ParentScope)) {
      throw new Error('This should never happen');
    }
    scope.addParent(rootParent, ec);
    return this;
  }

  /**
   * Synonym for reParent.  If current parentScope exists, it will replace it properly.
   * @param parent
   * @param ec
   */
  addParent(parent: Scope, ec?: LogExecutionContext): Scope {
    return this.reParent(parent, ec);
  }

  /**
   * Replaces child if it exists (by name)
   * @param child
   * @param ec
   * @return Returns this
   */
  addChild(child: Scope, ec?: LogExecutionContext): Scope {
    let childScopes: Scope [] = this.get(Scope.ChildScopes);
    if (!childScopes) {
      childScopes = [];
      this.set(Scope.ChildScopes, childScopes);
      childScopes.push(child);
    } else {
      const childScopeNdx = childScopes.findIndex(item => item.scopeName === this.scopeName);
      if (childScopeNdx >= 0) {
        childScopes.splice(childScopeNdx, 1, child);
      } else {
        childScopes.push(child);
      }
    }
    child.set(Scope.ParentScope, this);
    return this;
  }

  removeParent(ec?: LogExecutionContext): Scope {
    const existingParent = this.get(Scope.ParentScope);
    if (existingParent) {
      const parentChildScopes: Scope[] = existingParent.get(Scope.ChildScopes);
      if (parentChildScopes) {
        const thisScopeNdx = parentChildScopes.findIndex(item => item.scopeName === this.scopeName);
        if (thisScopeNdx >= 0) {
          parentChildScopes.splice(thisScopeNdx, 1);
        } else {
          const log = new LoggerAdapter(ec, 're-common', 'scope', 'removeParent');
          const err = new Error('Scope inconsistency...child scope not found in parent scope when removing parent');
          logErrorAndThrow(err, log);
        }
      }
    }
    return this;
  }



  protected addRuleElementReferenceItemResolution<C>(ruleElementRef: RuleElementReference<C>, factory: string | RuleElementFactory<any>, action?: ModuleResolutionAction, ec?: LogExecutionContext): Scope {
    const log = new LoggerAdapter(ec, 're-common', 'scope', 'addRuleElementReferenceItemResolution');
    if (ruleElementRef.moduleRef === undefined) {
      logErrorAndThrow(new EnhancedError('Undefined moduleRef'), log);
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
          _function: 'addRuleElementReferenceSetter',
          paramsArray: [factory, ec]
        },
        action
      });
      return undefined;
    }
  }

  private recurseRemoveScopedFactoryChildItems<C>(refNames: string[], factoryKey: string, ec): Scope {
    if (this.get(Scope.ChildScopes) == undefined) {
      return;
    }
    (this.get(Scope.ChildScopes) as Scope[]).forEach(childScope => {
      childScope.removeScopedFactoryItemsInScope<C>(refNames, factoryKey, ec);
      childScope.recurseRemoveScopedFactoryChildItems<C>(refNames, factoryKey, ec);
    });
    return this;
  }

  private removeScopedFactoryItemsInScope<C>(refNames: string[], factoryKey: string, ec: LogExecutionContext): Scope {
    const factory: ScopedFactory<C> = this.get(factoryKey);
    refNames.forEach(refName => {
      if (factory.hasRegistered(refName, ec)) {
        factory.unregister(refName, ec);
      }
    });
    return this;
  }
  /*
  loadPendingResolutionsFromReferences(ref: any | RuleElementReference<any>, factory?: string, action?: ModuleResolutionAction, ec?: LogExecutionContext) {
    if (this.moduleResolver.isResolving) {
      logErrorAndThrow(`Cannot load while resolving`, new LoggerAdapter(ec, 're-common', 'scope', 'loadPendingResolutionsFromReferences'));
    }
    if (isRuleElementReference(ref) && factory && action) {
      this.addRuleElementReferenceItemResolution(ref, factory, action ,ec);
    }
  }*/
}

