import {ExecutionContextI} from '@franzzemen/app-utility';
import {RuleElementInstanceReference, RuleElementModuleReference} from '../rule-element-ref/rule-element-reference.js';  // Do not import from index file

export interface ScopedFactory<C> {
  register(reference: C | RuleElementModuleReference | RuleElementInstanceReference<C>, override, execContext?: ExecutionContextI, ...params): C | Promise<C>;
  unregister(refName: string, execContext?: ExecutionContextI): boolean;
  hasRegistered(refName: string, execContext?: ExecutionContextI): boolean;
  getRegistered(refName: string, execContext?: ExecutionContextI): C;
}
