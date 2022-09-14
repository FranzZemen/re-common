import {ExecutionContextI, LoggerAdapter} from '@franzzemen/app-utility';
import {logErrorAndThrow} from '@franzzemen/app-utility/enhanced-error.js';
import {Operator, StandardOperator} from '../operator.js';

export class StandardPlusOperator extends Operator {
  constructor(symbol = StandardOperator.Plus) {
    super(symbol);
  }

  operate(lhs: any, rhs: any, ec?: ExecutionContextI): any {
    const log = new LoggerAdapter(ec, 'rules-engine', 'standard-plus-operator', 'operate');
    // LHS and RHS should be consistent and defined
    if(lhs === undefined || rhs === undefined) {
      const err = new Error('lhs or rhs are undefined');
      logErrorAndThrow(err, log, ec);
    }
    // LHS and RHS must have consistent basic types
    const typeofLHS = typeof lhs;
    const typeofRHS = typeof rhs;
    if(typeofLHS !== typeofRHS) {
      const err = new Error(`typeof lhs ${typeofLHS} is not the same as typeof rhs ${typeofRHS}`);
      logErrorAndThrow(err, log, ec);
    }
    // For the standard plus operator, only numbers and strings are allowed
    if(typeofLHS === 'number' || typeofLHS === 'string') {
      return lhs + rhs;
    } else {
      const err = new Error(`Only string or number are allowed, got ${typeofLHS}`);
      logErrorAndThrow(err, log, ec);
    }
  }
}
