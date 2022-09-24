import {ModuleDefinition} from '@franzzemen/app-utility';

export function copyModule(module: ModuleDefinition): ModuleDefinition {
  return {moduleName: module.moduleName, functionName: module.functionName, constructorName: module.constructorName};
}

/**
 * Refers to the definition of rule element from a module specification
 */
export interface RuleElementModuleReference {
  refName: string;
  module: ModuleDefinition;
}

export function copyRuleElementModuleReference (ref: RuleElementModuleReference): RuleElementModuleReference {
  return {refName: ref.refName, module: copyModule(ref.module)};
}

/**
 * Refers to the definition of a rule element as an instance
 */
export interface RuleElementInstanceReference<C> {
  refName: string;
  instance: C;
}


export class RuleElementReference<C> {
  moduleRef?: RuleElementModuleReference;
  instanceRef?: RuleElementInstanceReference<C>;
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

