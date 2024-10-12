import {RuleElementFactory, RuleElementReference} from '../../publish/mjs/index.js'


export interface RulesObjectImplI {
  refName: string;
  someFoo: string;
}

export class RuleElementImpl implements RuleElementReference<RulesObjectImplI>, RulesObjectImplI {
  moduleRef: undefined;
  instanceRef: undefined;
  static sequence = 0;
  refName: string;
  someFoo: string;
  thisSequence: number;
  constructor(...params) {
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
