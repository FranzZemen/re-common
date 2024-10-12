import {HasRefName} from '../../publish/mjs/index.js'

export class TestParser implements HasRefName {
  id: number;
  constructor( public refName: string) {

  }
  parse(remaining: string) {
    return remaining;
  }
}
