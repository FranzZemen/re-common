import {ExecutionContextI} from '@franzzemen/app-utility';
import chai from 'chai';
import 'mocha';
import {Scope} from '../../publish';

const expect = chai.expect;
const should = chai.should();

describe('re-common tests', () => {
  describe('class Scope tests', () => {
    it('should provide correct scope id', done => {
      const scope = new Scope();
      scope.scopeName.startsWith('Scope-').should.be.true;
      done();
    })
  })
})
