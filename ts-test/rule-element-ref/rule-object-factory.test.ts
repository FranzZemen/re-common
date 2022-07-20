import chai from 'chai';
import 'mocha';
import {RuleElementFactory, RuleElementModuleReference} from '../../publish';

import {RulesObjectImplI} from './rule-element-impl';


let should = chai.should();
let expect = chai.expect;


describe('Rules Engine Tests', () => {
  describe('Rule Object Factory Tests', () => {
    class RulesObjectImplFactory extends RuleElementFactory<RulesObjectImplI> {
      constructor() {
        super();
      }

      isC(obj: RulesObjectImplI | any): obj is RulesObjectImplI {
        return true;
      }
    }

    const factory = new RulesObjectImplFactory();
    const ref: RuleElementModuleReference = {refName: 'impl',
      module: {
        moduleName: '../../../testing/rule-element-ref/rule-element-impl',
        constructorName: 'RuleElementImpl'
      }
    };
    const instance: RulesObjectImplI = factory.register(ref, undefined, {config: {log: {level: 'debug'}}}, 'hello');
    it('should register an instance using a constructor name and one parameter', done => {
      expect(instance).to.exist;
      instance.someFoo.should.equal('hello');
      done();
    });
    it('should return an instance', done => {
      factory.getRegistered('impl').should.exist;
      done();
    });
    it('should unregister an instance', done => {
      factory.unregister('impl');
      expect(factory.getRegistered('impl')).to.be.undefined;
      done();
    });
  });
});
