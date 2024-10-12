import {inspect} from 'node:util';
import {ModuleResolutionAction, ModuleResolutionActionInvocation} from '@franzzemen/module-resolver';
import chai from 'chai';
import Validator from 'fastest-validator';
import 'mocha';
import {isPromise} from 'node:util/types';
import {
  CommonExecutionContext,
  RuleElementFactory,
  RuleElementInstanceReference,
  RuleElementModuleReference,
  Scope,
  validate
} from '../../publish/mjs/index.js'
import {RuleElementImpl, RulesObjectImplFactory, RulesObjectImplI} from '../rule-element-ref/rule-element-impl.js';

const expect = chai.expect;
const should = chai.should();


const unreachableCode = false;

describe('re-common tests', () => {
  describe('scope tests', () => {
    describe('scope/scope.tests', () => {
      it('should provide correct scope id', () => {
        const scope = new Scope();
        scope.scopeName.startsWith('Scope-').should.be.true;
        scope.typeOfScope().should.equal('Scope');
      });
      it('should have a parent scope', () => {
        const parentScope = new Scope();
        const parentId = parentScope.scopeName;
        const childScope = new Scope(undefined, parentScope);
        childScope.get(Scope.ParentScope).scopeName.should.equal(parentId);
        childScope.getScopeDepth().should.equal(1);
        parentScope.getScopeDepth().should.equal(0);
      });
      it('should re-parent scope', () => {
        const parentScope1 = new Scope();
        const parentId1 = parentScope1.scopeName;
        const parentScope2 = new Scope();
        const parentId2 = parentScope2.scopeName;
        const childScope = new Scope(undefined, parentScope1);
        childScope.reParent(parentScope2);
        childScope.get(Scope.ParentScope).scopeName.should.equal(parentId2);
        parentScope1.get(Scope.ChildScopes).length.should.equal(0);
        parentScope2.get(Scope.ChildScopes).length.should.equal(1);
        parentScope2.get(Scope.ChildScopes)[0].scopeName.should.equal(childScope.scopeName);
      });
      it('should add an item to a factory', () => {
        const scope = new Scope();
        const factoryName = 'TestFactory';
        scope.set(factoryName, new RulesObjectImplFactory());
        if (isPromise(scope.addRuleElementReferenceItems([{
          instanceRef: {
            refName: '1',
            instance: (new RuleElementImpl('1'))
          }
        }], factoryName))) {
          unreachableCode.should.be.true;
        }
        scope.get(factoryName).hasRegistered('1').should.be.true;
        scope.hasScopedFactoryItem('1', factoryName).should.be.true;
      });
      it('should remove an item from a factory', () => {
        const scope = new Scope();
        const factoryName = 'TestFactory';
        scope.set(factoryName, new RulesObjectImplFactory());
        if (isPromise(scope.addRuleElementReferenceItems([{
          instanceRef: {
            refName: '1',
            instance: (new RuleElementImpl('1'))
          }
        }], factoryName))) {
          unreachableCode.should.be.true;
        }
        if (isPromise(scope.addRuleElementReferenceItems([{
          instanceRef: {
            refName: '2',
            instance: (new RuleElementImpl('2'))
          }
        }], factoryName))) {
          unreachableCode.should.be.true;
        }
        if (isPromise(scope.addRuleElementReferenceItems([{
          instanceRef: {
            refName: '3',
            instance: (new RuleElementImpl('3'))
          }
        }], factoryName))) {
          unreachableCode.should.be.true;
        }
        (scope.get(factoryName) as RuleElementFactory<RuleElementImpl>).unregister('2');
        (scope.get(factoryName) as RuleElementFactory<RuleElementImpl>).getAllInstances().length.should.equal(2);
        (scope.get(factoryName) as RuleElementFactory<RuleElementImpl>).hasRegistered('1').should.equal(true);
        (scope.get(factoryName) as RuleElementFactory<RuleElementImpl>).hasRegistered('3').should.equal(true);
        (scope.get(factoryName) as RuleElementFactory<RuleElementImpl>).hasRegistered('2').should.equal(false);
      });
      /*
      OVERRIDE NOT IMPLEMENTED
      it('should override an item in the parent', () => {
        const parentScope = new Scope();
        const scope = new Scope(undefined, parentScope);
        const factoryName = 'TestFactory';
        parentScope.set(factoryName, new RulesObjectImplFactory());
        scope.set(factoryName, new RulesObjectImplFactory());
        const parentImpl: RuleElementReference<RuleElementImpl> = {instanceRef: {refName: '1', instance: (new RuleElementImpl('1'))}};
        const parentSequence = parentImpl.instanceRef.instance.thisSequence;
        parentScope.addRuleElementReferenceItems([parentImpl], factoryName);
        const impl: RuleElementReference<RuleElementImpl> = {instanceRef: {refName: '1', instance: (new RuleElementImpl('1'))}};
        const sequence = scope.getScopedFactoryItem('1', factoryName);
        scope.addRuleElementReferenceItems([impl], factoryName);
        (scope.get(factoryName) as RuleElementFactory<RuleElementImpl>).hasRegistered('1').should.be.false;
        scope.hasScopedFactoryItem('1', factoryName).should.be.true;
        (parentScope.get(factoryName) as RuleElementFactory<RuleElementImpl>).hasRegistered('1').should.be.true;
        parentScope.hasScopedFactoryItem('1', factoryName).should.be.true;
        (parentScope.get(factoryName) as RuleElementFactory<RuleElementImpl>).getRegistered('1').thisSequence.should.equal(sequence);
        parentScope.getScopedFactoryItem<RuleElementImpl>('1', factoryName, false).thisSequence.should.equal(sequence);
        expect(scope.getScopedFactoryItem<RuleElementImpl>('1', factoryName, false)).to.be.undefined;
        scope.getScopedFactoryItem<RuleElementImpl>('1', factoryName, true).thisSequence.should.equal(sequence);
      })
      it('should override down', () => {
        const parentScope = new Scope();
        const child1 = new Scope(undefined, parentScope);
        const child2 = new Scope(undefined, parentScope);
        const factoryName = 'TestFactory';
        parentScope.set(factoryName, new RulesObjectImplFactory());
        child1.set(factoryName, new RulesObjectImplFactory());
        child2.set(factoryName, new RulesObjectImplFactory());

        const child1Item: RuleElementInstanceReference<RuleElementImpl> = {refName: '1', instance: (new RuleElementImpl('1'))};
        const sequence1 = child1Item.instance.thisSequence;
        const child2Item: RuleElementInstanceReference<RuleElementImpl> = {refName: '1', instance: (new RuleElementImpl('1'))};
        const sequence2 = child2Item.instance.thisSequence;

        const parentImpl: RuleElementInstanceReference<RuleElementImpl> = {refName: '1', instance: (new RuleElementImpl('1'))};
        const parentSequence = parentImpl.instance.thisSequence;
        parentScope.addRuleElementReferenceItems([{instanceRef: parentImpl}], factoryName);
        (parentScope.get(factoryName) as RuleElementFactory<RuleElementImpl>).hasRegistered('1').should.be.true;
        (child1.get(factoryName) as RuleElementFactory<RuleElementImpl>).hasRegistered('1').should.be.false;
        (child2.get(factoryName) as RuleElementFactory<RuleElementImpl>).hasRegistered('1').should.be.false;
        parentScope.getScopedFactoryItem<RuleElementImpl>('1', factoryName, true).thisSequence.should.equal(parentSequence);
        child1.getScopedFactoryItem<RuleElementImpl>('1', factoryName, true).thisSequence.should.equal(parentSequence);
        child2.getScopedFactoryItem<RuleElementImpl>('1', factoryName, true).thisSequence.should.equal(parentSequence);
      });

       */
      it('should add module items', () => {
        const scope = new Scope();
        const factoryName = 'TestFactory';
        scope.set(factoryName, new RulesObjectImplFactory());
        const module1: RuleElementModuleReference = {
          refName: 'Type1',
          module: {
            moduleName: '../../../testing/rule-element-ref/rule-element-impl.js',
            constructorName: 'RuleElementImpl',
            paramsArray: ['First'],
            loadSchema: {
              useNewCheckerFunction: true,
              validationSchema: {
                refName: {type: 'string'},
                someFoo: {type: 'string'},
                thisSequence: {type: 'number'}
              }
            }
          }
        };

        const module2: RuleElementModuleReference = {
          refName: 'Type2',
          module: {
            moduleName: '../../../testing/rule-element-ref/rule-element-impl.js',
            constructorName: 'RuleElementImpl',
            paramsArray: ['Second'],
            loadSchema: (new Validator()).compile({
              refName: {type: 'string'},
              someFoo: {type: 'string'},
              thisSequence: {type: 'number'}
            })
          }
        };

        const item3: RuleElementInstanceReference<RuleElementImpl> = {
          refName: 'Type3',
          instance: new RuleElementImpl('Third')
        };

        class AClass {
          refName: 'Type2';
          mine: RulesObjectImplI;
          setMine: ModuleResolutionActionInvocation = (successfulResolution: boolean, factoryName: string, ec) => {
            const factory = scope.get(factoryName) as RulesObjectImplFactory;
            this.mine = factory.getRegistered(this.refName, ec);
            return Promise.resolve(true);
          };
        }

        const a = new AClass();

        const action: ModuleResolutionAction = {
          ownerIsObject: true,
          objectRef: a,
          _function: 'setMine',
          paramsArray: [factoryName, undefined]
        };

        scope.addRuleElementReferenceItems([
          {moduleRef: module1}, {moduleRef: module2}, {instanceRef: item3}], factoryName, [
          undefined, action, undefined]);


        let trueValOrPromise: true | Promise<true>;
        try {
          trueValOrPromise = Scope.resolve(scope);
        } catch (err) {
          console.error(err);
          unreachableCode.should.be.true;
        }
        if (isPromise(trueValOrPromise)) {
          trueValOrPromise.then(trueVal => {
            let impls: RuleElementImpl = scope.getRuleElementItem<RuleElementImpl>(module1.refName, factoryName, false);
            impls.refName.should.equal('First');
            impls.someFoo.should.equal('First');
            impls = scope.getRuleElementItem<RuleElementImpl>(module2.refName, factoryName, false);
            impls.refName.should.equal('Second');
            impls.someFoo.should.equal('Second');
            impls = scope.getRuleElementItem<RuleElementImpl>(module2.refName, factoryName, false);
            impls.refName.should.equal('Third');
            impls.refName.should.equal('Third');
            const factory = scope.get(factoryName) as RulesObjectImplFactory;
            factory.hasRegistered('Type1').should.be.true;
            factory.hasRegistered('Type2').should.be.true;
            factory.hasRegistered('Type3').should.be.true;
            expect(a.mine).to.exist;
          }, err => {
            console.error(err);
            unreachableCode.should.be.true;
          });
        } else {
          console.error('Cannot reach here, es modules make it async');
          unreachableCode.should.be.true;
        }
      });
      it('should set root parent', () => {
        const baseScope = new Scope({'re-common': {name: 'baseScope'}});
        const parent1 = new Scope({'re-common': {name: 'parent1'}});
        baseScope.setRootParent(parent1);
        baseScope.get(Scope.ParentScope).should.exist;
        parent1.get(Scope.ChildScopes).should.exist;
        parent1.get(Scope.ChildScopes).length.should.equal(1);

        const parent2 = new Scope({'re-common': {name: 'parent2'}});
        baseScope.setRootParent(parent2);
        baseScope.getParentAtHeight(2).scopeName.should.equal('parent2');
      });
      it('should validate', () => {
        const ec: CommonExecutionContext = {};
        const result = validate(ec);
        if (true === result) {
          console.log(inspect(ec, false, 10, true));
        } else {
          console.log(inspect(result, false, 10, true));
        }
        expect(result).to.equal(true);
      });
    });
  });
});
