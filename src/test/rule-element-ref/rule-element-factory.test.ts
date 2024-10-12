import chai from 'chai';
import 'mocha';
import {isPromise} from 'node:util/types';
// @ts-ignore
import {RuleElementReference}  from '@franzzemen/re-common';


import {RuleElementImpl, RulesObjectImplFactory, RulesObjectImplI} from './rule-element-impl.js';


let should = chai.should();
let expect = chai.expect;


describe('re-common tests', () => {
  describe('Rule Element Factory Tests', () => {
    const factory = new RulesObjectImplFactory();
    const ref: RuleElementReference<RuleElementImpl> = {
      moduleRef: {
        refName: 'impl',
        module: {
          moduleName: './testing/rule-element-ref/rule-element-impl.js',
          constructorName: 'RuleElementImpl',
          paramsArray: ['hello']
        }
      },
      instanceRef: {
        refName: 'impl',
        instance: new RuleElementImpl('impl')
      }
    };

    const instance: RulesObjectImplI = factory.register(ref,  {log: {options:{level: 'debug'}}});
    it('should register an instance using a constructor name and one parameter', () => {
      expect(instance).to.exist;
      if (isPromise(instance)) {
        instance.someFoo.should.equal('hello');
      }
    });
    it('should return an instance', () => {
      factory.getRegistered('impl').should.exist;
    });
    it('should unregister an instance', () => {
      factory.unregister('impl');
      expect(factory.getRegistered('impl')).to.be.undefined;
    });
  });
});
