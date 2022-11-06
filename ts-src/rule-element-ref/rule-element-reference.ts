/**
 * Refers to the definition of rule element from a module specification
 */
import _ from 'lodash';
import {ModuleDefinition} from '@franzzemen/hints';

export interface RuleElementModuleReference {
  refName: string;
  module: ModuleDefinition;
}

/**
 * Refers to the definition of a rule element as an instance
 */
export interface RuleElementInstanceReference<C> {
  refName: string;
  instance: C;
}


export interface RuleElementReference<C> {
  moduleRef?: RuleElementModuleReference;
  instanceRef?: RuleElementInstanceReference<C>;
}

export function _mergeRuleElementModuleReference(target?: RuleElementModuleReference, source?: RuleElementModuleReference, mergeInto = false) : RuleElementModuleReference {
  if(!target && !source) {
    return undefined;
  }
  const _target = _.merge(mergeInto ? target? target: {} : {}, source);
  // const _target: Partial<RuleElementModuleReference> = mergeInto ? target ? target : {} : {};
  // _target.refName = source?.refName ? source.refName : target?.refName;
  // _target.module = _mergeModuleDefinition(target?.module, source?.module, mergeInto);
  return _target as RuleElementModuleReference;
}

/**
 * Note that instance is copied by reference, not a deep copy
 * @param target
 * @param source
 * @param mergeInto
 */
export function _mergeRuleElementInstanceReference<C>(target?: RuleElementInstanceReference<C>, source?: RuleElementInstanceReference<C>, mergeInto = false) {
  if(!target && !source) {
    return undefined;
  }
  const _target: Partial<RuleElementInstanceReference<C>> = mergeInto ? target ? target : {} : {};
  _target.refName = source?.refName ? source.refName : target?.refName;
  _target.instance = source?.instance ? source.instance : target?.instance;
  return _target as RuleElementInstanceReference<C>
}

export function _mergeRuleElementReference<C>(target?: RuleElementReference<C>, source?: RuleElementReference<C>, mergeInto = false) {
  if(!target && !source) {
    return undefined;
  }
  const _target = _.merge(mergeInto ? target ? target : {} : {}, source);
  //const _target: Partial<RuleElementReference<C>> = mergeInto ? target ? target : {} : {};
  //_target.moduleRef = _mergeRuleElementModuleReference(target?.moduleRef, source?.moduleRef, mergeInto);
  //_target.instanceRef = _mergeRuleElementInstanceReference<C>(target?.instanceRef, source?.instanceRef, mergeInto);
  return _target as RuleElementReference<C>;
}


export function isRuleElementModuleReference (reference: any | RuleElementModuleReference): reference is RuleElementModuleReference {
  // Ref must be an object
  if(reference !== undefined && typeof reference === 'object') {
    // refName must be a non-empty string
    if(reference.refName !== undefined && typeof reference.refName === 'string' && reference.refName.trim().length > 0) {
      // module must be an object
      if(reference.module !== undefined && typeof reference.module === 'object') {
        //moduleName must be a non-empty string
        if(reference.module.moduleName !== undefined && typeof reference.module.moduleName === 'string' && reference.module.moduleName.trim().length > 0) {
          // functionName and constructorName should not both exist (but they can both not exist)
          if(reference.module.functionName !== undefined && reference.module.constructorName !== undefined) {
            return false;
          }
          // if functionName exists it must be a non-empty string
          if(reference.module.functionName !== undefined) {
            return typeof reference.module.functionName === 'string' && reference.module.functionName.trim().length > 0;
          }
          // if constructorName exists it must be a non-empty string
          if(reference.module.constructorName !== undefined) {
            return typeof reference.module.constructorName === 'string' && reference.module.constructorName.trim().length > 0;
          }
          // If only the moduleName exists than it implies a default export
          return true;
        }
      }
    }
  }
}

export function isRuleElementInstanceReference(ref: any | RuleElementInstanceReference<any>): ref is RuleElementInstanceReference<any> {
  // Ref must be an object
  return (ref && typeof ref === 'object' && 'refName' in ref && 'instance' in ref && typeof ref.refName === 'string' && ref.refName.trim().length > 0);
}

export function isRuleElementReference(ref: any | RuleElementReference<any>): ref is RuleElementReference<any> {
  return (ref && ('moduleRef' in ref || 'instanceRef' in ref));
}

