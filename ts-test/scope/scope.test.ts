import chai from 'chai';
import 'mocha';
import {RuleElementFactory, Scope} from '../../publish/index.js';
import {RulesObjectImplI} from '../rule-element-ref/rule-element-impl.js';

const expect = chai.expect;
const should = chai.should();


class RulesObjectImplFactory extends RuleElementFactory<RulesObjectImplI> {
  constructor() {
    super();
  }

  isC(obj: RulesObjectImplI | any): obj is RulesObjectImplI {
    return true;
  }
}

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
    });
  });
});
