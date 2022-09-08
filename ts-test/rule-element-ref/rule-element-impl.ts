import {RuleElementFactory, RuleElementReference} from '../../publish/index.js';


export interface RulesObjectImplI {
  refName: string;
  someFoo: string;
}

export class RuleElementImpl extends RuleElementReference<RulesObjectImplI> implements RulesObjectImplI {
  static sequence = 0;
  refName: string;
  someFoo: string;
  thisSequence: number;
  constructor(...params) {
    super();
    this.someFoo = params[0];
    this.refName = this.someFoo;
    this.thisSequence = RuleElementImpl.sequence++;
  }
}

export class RulesObjectImplFactory extends RuleElementFactory<RulesObjectImplI> {
  constructor() {
    super();
  }

  isC(obj: RulesObjectImplI | any): obj is RulesObjectImplI {
    return true;
  }
}
