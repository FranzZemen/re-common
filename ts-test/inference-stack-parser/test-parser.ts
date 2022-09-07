import {HasRefName} from '../../publish/index.js';

export class TestParser implements HasRefName {
  id: number;
  constructor( public refName: string) {

  }
  parse(remaining: string) {
    return remaining;
  }
}
