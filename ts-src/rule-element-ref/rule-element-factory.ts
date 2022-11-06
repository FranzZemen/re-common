import {EnhancedError, logErrorAndThrow, LogExecutionContext, LoggerAdapter} from '@franzzemen/hints';
import {ScopedFactory} from '../scope/scoped-factory.js';
import {RuleElementReference} from './rule-element-reference.js';

export abstract class RuleElementFactory<C> implements ScopedFactory<C> {
  protected repo = new Map<string, RuleElementReference<C>>();

  constructor() {
  }

  register(ruleElementRef: RuleElementReference<C>,  ec?: LogExecutionContext): C {
    const log = new LoggerAdapter(ec, 'rules-engine', 'rule-element-ref-ref-factory', 'register');
    if (ruleElementRef.instanceRef === undefined) {
      log.warn(ruleElementRef, 'register requires an instance');
      logErrorAndThrow(new EnhancedError('register requires an instance'), log);
    }
    const refName = ruleElementRef.instanceRef.refName;
    if (!refName) {
      logErrorAndThrow(new EnhancedError('No reference name'), log);
    }
    if(this.hasRegistered(refName)) {
      log.warn(ruleElementRef, `Not overriding element with same name ${refName}`)
      return this.getRegistered(refName, ec);
    }
    this.repo.set(refName, ruleElementRef);
    return ruleElementRef.instanceRef.instance;
  }

  unregister(refName: string, execContext?: LogExecutionContext): boolean {
    if (!this.repo.delete(refName)) {
      const log = new LoggerAdapter(execContext, 'rules-engine', 'rule-element-ref-ref-factory', 'unregister');
      log.warn(`No reference with refName ${refName} to unregister`);
      return false;
    }
    return true;
  }

  getRegistered(refName: string, execContext?: LogExecutionContext): C {
    const ruleElement: RuleElementReference<C> = this.repo.get(refName);
    if (ruleElement) {
      return ruleElement.instanceRef.instance;
    } else {
      const log = new LoggerAdapter(execContext, 'rules-engine', 'rule-element-ref-ref-factory', 'hasRegistered');
      log.warn(`No reference with refName ${refName} to get.  Use 'hasRegistered' instead to check for existence of refName`);
      return undefined;
    }
  }

  hasRegistered(refName: string, execContext?: LogExecutionContext): boolean {
    return this.repo.has(refName);
  }

  getAllInstances(): C[] {
    let c: C[] = [];
    this.repo.forEach(element => {
      c.push(element.instanceRef.instance);
    });
    return c;
  }

  protected abstract isC(obj: any | C): obj is C;
}


