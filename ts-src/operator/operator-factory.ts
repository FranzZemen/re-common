import {RuleElementFactory} from '../rule-element-ref/rule-element-factory.js';
import {isOperator, OperatorI, StandardOperator} from './operator.js';
import {StandardPlusOperator} from './standard/standard-plus-operator.js';


export function setOperators(synonyms: string[], operator: OperatorI) : Map<string, OperatorI> {
  const operatorMap = new Map<string, OperatorI>();
  synonyms.forEach(synonym => {
    operatorMap.set(synonym, operator);
  });
  return operatorMap;
}

export class OperatorFactory extends RuleElementFactory<OperatorI> {
  isC<OperatorI> (operator: OperatorI | any): operator is OperatorI {
    return isOperator(operator);
  }

  constructor(populateStandard = true) {
    super();
    if(populateStandard) {
      this.register({
        refName: StandardOperator.Plus,
        instance: new StandardPlusOperator()
      });
    }
  }
}


