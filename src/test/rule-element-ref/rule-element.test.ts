import {isRuleElementModuleReference, RuleElementModuleReference} from '../../publish/mjs/index.js'
import chai from 'chai';
import 'mocha';


let should = chai.should();
let expect = chai.expect;

describe('re-common tests', () => {
  describe('Rule Object tests', () => {
    it('should evaluate RulesObjectReferenceI to true for {refName:\'testName\', module:{moduleName:\'someModule\'}}', done => {
      const ref: RuleElementModuleReference = {refName:'testName', module:{moduleName:'someModule'}};
      const result = isRuleElementModuleReference(ref);
      expect(result).to.exist;
      result.should.be.true;
      done();
    });
  });
});
