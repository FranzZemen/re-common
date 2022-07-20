import {ExecutionContextI, loadFromModule, LoggerAdapter} from '@franzzemen/app-utility';
import {ScopedFactory} from '../scoped-factory/scoped-factory';
import {
  isRuleElementModuleReference,
  RuleElementInstanceReference,
  RuleElementModuleReference,
  RuleElementReference
} from './rule-element-reference';

export abstract class RuleElementFactory<C> implements ScopedFactory<C> {
  protected repo = new Map<string, RuleElementReference<C>>();

  constructor() {
  }


  register(reference: RuleElementModuleReference | RuleElementInstanceReference<C>, override = false, ec?: ExecutionContextI, ...params): C {
    if(!reference.refName) {
      throw new Error('No reference name');
    }
    if(override === false && this.hasRegistered(reference.refName)) {
      const log = new LoggerAdapter(ec, 'rules-engine', 'rule-element-ref-ref-factory', 'register');
      log.warn(`Not registering refName ${reference.refName} and override is ${override}`);
      return undefined;
    }
    if(isRuleElementModuleReference(reference)) {
      if (this.repo.get(reference.refName) && override) {
        const log = new LoggerAdapter(ec, 'rules-engine', 'rule-element-ref-ref-factory', 'register');
        log.warn(`Overwriting registration for ${reference.refName} with override ${override}`);
      }
      // Last parameter should be Execution Context
      if(params) {
        params.push(ec);
      } else {
        params = [ec];
      }
      const instance = loadFromModule<C>(reference.module, params);
      if (instance) {
        const ruleElement = new RuleElementReference<C>();
        ruleElement.moduleRef = reference;
        ruleElement.instanceRef = {refName: reference.refName, instance};
        this.repo.set(reference.refName, ruleElement);
        return ruleElement.instanceRef.instance;
      }
    } else {
      const ruleElement: RuleElementReference<C>= {instanceRef: reference};
      this.repo.set(reference.refName, ruleElement);
      return ruleElement.instanceRef.instance;
    }
  }


  protected abstract isC(obj: any | C): obj is C;

  unregister(refName: string, execContext?: ExecutionContextI): boolean {
    if (!this.repo.delete(refName)) {
      const log = new LoggerAdapter(execContext, 'rules-engine', 'rule-element-ref-ref-factory', 'unregister');
      log.warn(`No reference with refName ${refName} to unregister`);
      return false;
    }
    return true;
  }

  getRegistered(refName: string, execContext?: ExecutionContextI): C {
    const ruleElement: RuleElementReference<C> = this.repo.get(refName);
    if(ruleElement) {
      return ruleElement.instanceRef.instance;
    } else {
      const log = new LoggerAdapter(execContext, 'rules-engine', 'rule-element-ref-ref-factory', 'hasRegistered');
      log.warn(`No reference with refName ${refName} to get.  Use 'hasRegistered' instead to check for existence of refName`);
      return undefined;
    }
  }

  hasRegistered(refName: string, execContext?: ExecutionContextI): boolean {
    return this.repo.has(refName);
  }

  getAllInstances(): C[] {
    let c: C[] = [];
    this.repo.forEach(element => {
      c.push(element.instanceRef.instance);
    });
    return c;
  }


}


