import 'mocha';
import chai from 'chai';
import {isEnumeratedType, reverseEnumerationToSet} from '../../publish/index.js';

let should = chai.should();
let expect = chai.expect;

describe ('Enum Util Tests', () => {
  it('Should convert text enum to Set', done => {
    enum TestEnum {
      hello = 'hello',
      world = 'world',
      there = 'there'
    }
    const mySet = reverseEnumerationToSet(TestEnum);
    mySet.size.should.equal(3);
    mySet.has(TestEnum.hello).should.be.true;
    mySet.has(TestEnum.world).should.be.true;
    mySet.has(TestEnum.there).should.be.true;
    done();
  });
  it('Should identify enumerated type', done => {
    enum TestEnum {
      hello = 'hello',
      world = 'world',
      there = 'there'
    }
    const mySet = reverseEnumerationToSet(TestEnum);
    isEnumeratedType<TestEnum> ('hello', mySet).should.be.true;
    done();
  });
});
