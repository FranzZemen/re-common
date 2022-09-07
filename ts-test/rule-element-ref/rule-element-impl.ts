import {RuleElementReference} from '../../publish/index.js'


export interface RulesObjectImplI {
  refName: string;
  someFoo: string;
}

export class RuleElementImpl extends RuleElementReference<RulesObjectImplI> implements RulesObjectImplI {
  refName: string;
  someFoo: string;
  constructor(...params) {
    super();
    this.someFoo = params[0];
  }
}
