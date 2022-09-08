import chai from 'chai';
import 'mocha';
import {RuleElementFactory, RuleElementInstanceReference, Scope} from '../../publish/index.js';
import {RuleElementImpl, RulesObjectImplFactory, RulesObjectImplI} from '../rule-element-ref/rule-element-impl.js';

const expect = chai.expect;
const should = chai.should();



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
      it('should add an item to a factory', () =>{
        const scope = new Scope();
        const factoryName = 'TestFactory';
        scope.set(factoryName, new RulesObjectImplFactory());
        scope.addScopedFactoryItems([{refName: '1', instance: (new RuleElementImpl('1'))}], factoryName);
        scope.get(factoryName).hasRegistered('1').should.be.true;
        scope.hasScopedFactoryItem('1',factoryName).should.be.true;
      });
      it('should remove an item from a factory', () => {
        const scope = new Scope();
        const factoryName = 'TestFactory';
        scope.set(factoryName, new RulesObjectImplFactory());
        scope.addScopedFactoryItems([{refName: '1', instance: (new RuleElementImpl('1'))}], factoryName);
        scope.addScopedFactoryItems([{refName: '2', instance: (new RuleElementImpl('2'))}], factoryName);
        scope.addScopedFactoryItems([{refName: '3', instance: (new RuleElementImpl('3'))}], factoryName);
        (scope.get(factoryName) as RuleElementFactory<RuleElementImpl>).unregister('2');
        (scope.get(factoryName) as RuleElementFactory<RuleElementImpl>).getAllInstances().length.should.equal(2);
        (scope.get(factoryName) as RuleElementFactory<RuleElementImpl>).hasRegistered('1').should.equal(true);
        (scope.get(factoryName) as RuleElementFactory<RuleElementImpl>).hasRegistered('3').should.equal(true);
        (scope.get(factoryName) as RuleElementFactory<RuleElementImpl>).hasRegistered('2').should.equal(false);
      })
      it('should override an item in the parent', () => {
        const parentScope = new Scope();
        const scope = new Scope(undefined, parentScope);
        const factoryName = 'TestFactory';
        parentScope.set(factoryName, new RulesObjectImplFactory());
        scope.set(factoryName, new RulesObjectImplFactory());
        const parentImpl: RuleElementInstanceReference<RuleElementImpl> = {refName: '1', instance: (new RuleElementImpl('1'))};
        const parentSequence = parentImpl.instance.thisSequence;
        parentScope.addScopedFactoryItems([parentImpl], factoryName);
        const impl: RuleElementInstanceReference<RuleElementImpl> = {refName: '1', instance: (new RuleElementImpl('1'))};
        const sequence = impl.instance.thisSequence;
        scope.addScopedFactoryItems([impl], factoryName, true);
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
        parentScope.addScopedFactoryItems([parentImpl], factoryName, false, true);
        (parentScope.get(factoryName) as RuleElementFactory<RuleElementImpl>).hasRegistered('1').should.be.true;
        (child1.get(factoryName) as RuleElementFactory<RuleElementImpl>).hasRegistered('1').should.be.false;
        (child2.get(factoryName) as RuleElementFactory<RuleElementImpl>).hasRegistered('1').should.be.false;
        parentScope.getScopedFactoryItem<RuleElementImpl>('1', factoryName, true).thisSequence.should.equal(parentSequence);
        child1.getScopedFactoryItem<RuleElementImpl>('1', factoryName, true).thisSequence.should.equal(parentSequence);
        child2.getScopedFactoryItem<RuleElementImpl>('1', factoryName, true).thisSequence.should.equal(parentSequence);
      });
    });
  });
});
