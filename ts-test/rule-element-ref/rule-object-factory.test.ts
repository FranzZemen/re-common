import {ModuleResolution} from '@franzzemen/app-utility';
import chai from 'chai';
import 'mocha';
import {isPromise} from 'node:util/types';
import {RuleElementFactory, RuleElementModuleReference} from '../../publish/index.js';

import {RulesObjectImplI} from './rule-element-impl.js';


let should = chai.should();
let expect = chai.expect;


describe('re-common tests', () => {
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
        moduleName: '../../../testing/rule-element-ref/rule-element-impl.js',
        constructorName: 'RuleElementImpl',
        moduleResolution: ModuleResolution.es
      }
    };
    const instanceOrPromise: RulesObjectImplI | Promise<RulesObjectImplI>= factory.register(ref, undefined, undefined, ['hello'],{config: {log: {level: 'debug'}}});
    it('should register an instance using a constructor name and one parameter', () => {
      expect(instanceOrPromise).to.exist;
      if (isPromise(instanceOrPromise)) {
        return instanceOrPromise
          .then(instance => {
            return instance.someFoo.should.equal('hello');
          })
      } else {
        instanceOrPromise.someFoo.should.equal('hello');
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
