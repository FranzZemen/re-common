import {LogExecutionContext} from '@franzzemen/logger-adapter';
import {
  RuleElementInstanceReference,
  RuleElementModuleReference,
  RuleElementReference
} from '../rule-element-ref/rule-element-reference.js';  // Do not import from index file

export interface ScopedFactory<C> {
  register(reference: C | RuleElementModuleReference | RuleElementInstanceReference<C> | RuleElementReference<C>, ec?: LogExecutionContext): C | Promise<C>;
  unregister(refName: string, execContext?: LogExecutionContext): boolean;
  hasRegistered(refName: string, execContext?: LogExecutionContext): boolean;
  getRegistered(refName: string, execContext?: LogExecutionContext): C;
}
