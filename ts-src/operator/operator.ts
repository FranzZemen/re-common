import {LogExecutionContext} from '@franzzemen/logger-adapter';
import {isEnumeratedType, reverseEnumerationToSet} from '../util/enum-util.js';

export enum StandardOperator {
  Plus = '+',
  Minus = '-',
  Times = '*',
  DividedBy = '/',
  Mod = '%',
  Exp = '^'
}

const standardOperatorReverseMapping = reverseEnumerationToSet (StandardOperator);

export function isStandardOperator (standardDataType: StandardOperator | string | any): standardDataType is StandardOperator {
  return isEnumeratedType<StandardOperator>(standardDataType, standardOperatorReverseMapping);
}

export function isOperator(operator: OperatorI | any): operator is OperatorI {
  return operator !== undefined && operator.refName !== undefined && typeof operator.refName === 'string' && operator.refName.trim.length > 0 && 'operate' in operator;
}

export interface OperatorI {
  refName: string;
  // A multi-variate operator is one that can handle expressions with multiple final values, such as a Set Expression
  lhsMultiVariate?: boolean;
  rhsMultiVariate?: boolean;
  twoSidedMultiVariate?: boolean;
  operate(lhs:any , rhs:any, ec?: LogExecutionContext): any;
}

export abstract class Operator implements OperatorI {
  constructor(public refName: string, public lhsMultiVariate = false, public rhsMultivariate = false, twoSidedMultivariate = false) {
  }

  abstract operate(lhs:any , rhs:any, ec?: LogExecutionContext): any;
}
