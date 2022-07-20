import {RuleElementReference} from '../../publish'


export interface RulesObjectImplI {
  refName: string;
  someFoo: string;
}

export class RuleElementImpl extends RuleElementReference<RulesObjectImplI> implements RulesObjectImplI{
  refName: string;
  someFoo: string;
  constructor(params: any[]) {
    super();
    this.someFoo = params[0];
  }
}
