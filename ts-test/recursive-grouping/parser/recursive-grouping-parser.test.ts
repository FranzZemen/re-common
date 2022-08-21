import {ExecutionContextI} from '@franzzemen/app-utility';
import chai from 'chai';
import 'mocha';
import {
  Fragment,
  FragmentParser,
  isFragment,
  isRecursiveGrouping,
  RecursiveGroupingParser,
  Scope
} from '../../../publish';
;


const expect = chai.expect;
const should = chai.should();


enum TestOperatorType {
  A = 'a',
  B = 'b',
  C = 'c',
  D = 'd'
}

class TestReference {
  value: string;
}

class TestFragmentParser extends FragmentParser<TestReference> {
  constructor() {
    super();
  }
  parse(fragment: string, scope: Map<string, any>, ec?: ExecutionContextI): [string, TestReference] {
    const result = /^(HelloWorld)\s*([^]*)$/.exec(fragment);
    const ref: TestReference = {value: undefined};
    if(result) {
      ref.value = result[1];
      fragment = result[2];
    }
    return [fragment, ref];
  }
}

class TestRecursiveGrouping extends RecursiveGroupingParser<TestOperatorType, TestReference> {
  constructor() {
    super(new TestFragmentParser());
  }
}

const scope = new Scope();
// Override the scope key to insert this test parser

const operators = [TestOperatorType.A, TestOperatorType.B, TestOperatorType.C, TestOperatorType.D];
const endConditionTests = [/^<<[^]*$/, /^HH[^]*$/];

const unreachableCode = false;

describe('re-common tests', () => {
  describe('core/recursive-grouping/parser/recursive-grouping-parser.test', () => {
    it('should not parse empty string to a reference', done => {
      const recursiveParser = new TestRecursiveGrouping();
      let [remaining, grouping] = recursiveParser.parse('', scope, operators, TestOperatorType.A, endConditionTests);
      remaining.should.exist;
      remaining.length.should.equal(0);
      expect(grouping).to.be.undefined;
      done();
    });
    it('should not parse empty but not 0 length string " "', done => {
      const recursiveParser = new TestRecursiveGrouping();
      let [remaining, grouping] = recursiveParser.parse(' ', scope, operators, TestOperatorType.A, endConditionTests, TestOperatorType.A);
      remaining.should.exist;
      remaining.length.should.equal(0);
      expect(grouping).to.be.undefined;
      done();
    });
    it('should parse exactly one Fragment "HelloWorld"', done => {
      const recursiveParser = new TestRecursiveGrouping();
      let [remaining, grouping] = recursiveParser.parse('HelloWorld', scope, operators, TestOperatorType.A, endConditionTests);
      remaining.should.exist;
      remaining.length.should.equal(0);
      grouping.should.exist;
      grouping.operator.should.equal(TestOperatorType.A);
      grouping.group.length.should.equal(1);
      grouping.group[0].operator.should.equal(TestOperatorType.A);
      (grouping.group[0] as Fragment<TestOperatorType, TestReference>).reference.value.should.equal('HelloWorld');
      done();
    });
    it('should parse Fragment followed by extra text delineated by an end condition "HelloWorld << 12345"', done => {
      const recursiveParser = new TestRecursiveGrouping();
      let [remaining, grouping] = recursiveParser.parse('HelloWorld << 12345', scope, operators, TestOperatorType.A, endConditionTests, TestOperatorType.A);
      remaining.should.exist;
      remaining.should.equal('<< 12345');
      grouping.should.exist;
      grouping.operator.should.equal(TestOperatorType.A);
      grouping.group.length.should.equal(1);
      grouping.group[0].operator.should.equal(TestOperatorType.A);
      (grouping.group[0] as Fragment<TestOperatorType, TestReference>).reference.value.should.equal('HelloWorld');
      done();
    });
    it('should parse Fragment followed by extra text delineated by another end condition "HelloWorld HH 12345"', done => {
      const recursiveParser = new TestRecursiveGrouping();
      let [remaining, grouping] = recursiveParser.parse('HelloWorld HH 12345', scope, operators, TestOperatorType.A, endConditionTests, TestOperatorType.A);
      remaining.should.exist;
      remaining.should.equal('HH 12345');
      grouping.should.exist;
      grouping.operator.should.equal(TestOperatorType.A);
      grouping.group.length.should.equal(1);
      grouping.group[0].operator.should.equal(TestOperatorType.A);
      (grouping.group[0] as Fragment<TestOperatorType, TestReference>).reference.value.should.equal('HelloWorld');
      done();
    });
    it('should fail on parse bad format (no end condition) "HelloWorld 12345"', done => {
      const recursiveParser = new TestRecursiveGrouping();
      try {
        let [remaining, grouping] = recursiveParser.parse('HelloWorld 12345', scope, operators, TestOperatorType.A, endConditionTests);
        unreachableCode.should.be.true;
      } catch (err) {
      } finally {
        done();
      }
    });
    it('should parse exactly one sub group with one fragment "(HelloWorld)"', done => {
      const recursiveParser = new TestRecursiveGrouping();
      let [remaining, grouping] = recursiveParser.parse('(HelloWorld)', scope, operators, TestOperatorType.A, endConditionTests);
      remaining.should.exist;
      remaining.should.equal('');
      grouping.should.exist;
      grouping.operator.should.equal(TestOperatorType.A);
      grouping.group.length.should.equal(1);
      let subGroup = grouping.group[0];
      if(isRecursiveGrouping(subGroup)) {
        subGroup.group.length.should.equal(1);
        if(isFragment(subGroup.group[0])) {
          subGroup.group[0].reference.value.should.equal('HelloWorld');
          subGroup.group[0].operator.should.equal(TestOperatorType.A);
        } else {
          unreachableCode.should.be.true;
        }
      } else {
        unreachableCode.should.be.true;
      }
      done();
    });
    it('should parse exactly one Sub group with one fragment and an end condition "(HelloWorld)" << 12345', done => {
      const recursiveParser = new TestRecursiveGrouping();
      let [remaining, grouping] = recursiveParser.parse('(HelloWorld) << 12345', scope, operators, TestOperatorType.A, endConditionTests);
      remaining.should.exist;
      remaining.should.equal('<< 12345');
      grouping.should.exist;
      grouping.operator.should.equal(TestOperatorType.A);
      grouping.group.length.should.equal(1);
      let subGroup = grouping.group[0];
      if(isRecursiveGrouping(subGroup)) {
        subGroup.group.length.should.equal(1);
        if(isFragment(subGroup.group[0])) {
          subGroup.group[0].reference.value.should.equal('HelloWorld');
        } else {
          unreachableCode.should.be.true;
        }
      } else {
        unreachableCode.should.be.true;
      }
      done();
    });
    it('should parse exactly one subgroup & fragment with a leading subgroup operator "b (HelloWorld)" << 12345', done => {
      const recursiveParser = new TestRecursiveGrouping();
      let [remaining, grouping] = recursiveParser.parse('b (HelloWorld) << 12345', scope, operators, TestOperatorType.A, endConditionTests);
      remaining.should.exist;
      remaining.should.equal('<< 12345');
      grouping.should.exist;
      grouping.operator.should.equal(TestOperatorType.A);
      grouping.group.length.should.equal(1);
      let subGroup = grouping.group[0];
      if(isRecursiveGrouping(subGroup)) {
        subGroup.group.length.should.equal(1);
        subGroup.operator.should.equal(TestOperatorType.B);
        if(isFragment(subGroup.group[0])) {
          subGroup.group[0].reference.value.should.equal('HelloWorld');
          subGroup.group[0].operator.should.equal(TestOperatorType.A);
        } else {
          unreachableCode.should.be.true;
        }
      } else {
        unreachableCode.should.be.true;
      }
      done();
    });
    it('should parse exactly one subgroup & fragment with a leading subgroup operator, fragment operator "b (c HelloWorld)" << 12345', done => {
      const recursiveParser = new TestRecursiveGrouping();
      let [remaining, grouping] = recursiveParser.parse('b (c HelloWorld) << 12345', scope, operators, TestOperatorType.A, endConditionTests);
      remaining.should.exist;
      remaining.should.equal('<< 12345');
      grouping.should.exist;
      grouping.operator.should.equal(TestOperatorType.A);
      grouping.group.length.should.equal(1);
      let subGroup = grouping.group[0];
      if(isRecursiveGrouping(subGroup)) {
        subGroup.group.length.should.equal(1);
        subGroup.operator.should.equal(TestOperatorType.B);
        if(isFragment(subGroup.group[0])) {
          subGroup.group[0].reference.value.should.equal('HelloWorld');
          subGroup.group[0].operator.should.equal(TestOperatorType.C);
        } else {
          unreachableCode.should.be.true;
        }
      } else {
        unreachableCode.should.be.true;
      }
      done();
    });
    it('should parse exactly one subgroup with one fragment along with 2nd fragment at top level with a leading subgroup operator, fragment operator "b (c HelloWorld) d HelloWorld" << 12345', done => {
      const recursiveParser = new TestRecursiveGrouping();
      let [remaining, grouping] = recursiveParser.parse('b (c HelloWorld) d HelloWorld << 12345', scope, operators, TestOperatorType.A, endConditionTests);
      remaining.should.exist;
      remaining.should.equal('<< 12345');
      grouping.should.exist;
      grouping.operator.should.equal(TestOperatorType.A);
      grouping.group.length.should.equal(2);
      let subGroup = grouping.group[0];
      if(isRecursiveGrouping(subGroup)) {
        subGroup.group.length.should.equal(1);
        subGroup.operator.should.equal(TestOperatorType.B);
        if(isFragment(subGroup.group[0])) {
          subGroup.group[0].reference.value.should.equal('HelloWorld');
          subGroup.group[0].operator.should.equal(TestOperatorType.C);
        } else {
          unreachableCode.should.be.true;
        }
      } else {
        unreachableCode.should.be.true;
      }
      let fragment = grouping.group[1];
      if(isFragment(fragment)) {
        fragment.operator.should.equal(TestOperatorType.D);
        fragment.reference.value.should.equal('HelloWorld');
      } else {
        unreachableCode.should.be.true;
      }
      done();
    });
    it('should parse complex "b (c HelloWorld b HelloWorld a (d HelloWorld) d HelloWorld) d HelloWorld b (HelloWorld) << 12345"', done => {
      const recursiveParser = new TestRecursiveGrouping();
      let [remaining, grouping] = recursiveParser.parse('b (c HelloWorld b HelloWorld a (d HelloWorld) d HelloWorld) d HelloWorld b (HelloWorld) << 12345', scope, operators, TestOperatorType.A, endConditionTests);
      remaining.should.exist;
      remaining.should.equal('<< 12345');
      grouping.should.exist;
      grouping.operator.should.equal(TestOperatorType.A);
      grouping.group.length.should.equal(3);
      let subGroup1 = grouping.group[0]; // b (c HelloWorld b HelloWorld a (d HelloWorld) d HelloWorld)
      let subFragment1 = grouping.group[1]; // d HelloWorld
      let subGroup3 = grouping.group[2]; // b (HelloWorld)

      // Subgroup 1
      if(isRecursiveGrouping(subGroup1)) {
        subGroup1.group.length.should.equal(4);
        subGroup1.operator.should.equal(TestOperatorType.B);
        let fragment1 = subGroup1.group[0];
        let fragment2 = subGroup1.group[1];
        let subSubGroup = subGroup1.group[2];
        let fragment3 = subGroup1.group[3];
        // fragment 1
        if(isFragment(fragment1)) {
          fragment1.operator.should.equal(TestOperatorType.C);
          fragment1.reference.value.should.equal('HelloWorld');
        } else {
          unreachableCode.should.be.true;
        }
        // fragment 2
        if(isFragment(fragment2)) {
          fragment2.operator.should.equal(TestOperatorType.B);
          fragment2.reference.value.should.equal('HelloWorld');
        } else {
          unreachableCode.should.be.true;
        }
        // subSubGroup
        if(isRecursiveGrouping(subSubGroup)) {
          subSubGroup.operator.should.equal(TestOperatorType.A);
          subSubGroup.group.length.should.equal(1);
          subSubGroup.group[0].operator.should.equal(TestOperatorType.D);
          if(isFragment(subSubGroup.group[0])) {
            subSubGroup.group[0].reference.value.should.equal('HelloWorld');
          } else {
            unreachableCode.should.be.true;
          }
        } else {
          unreachableCode.should.be.true;
        }
        // fragment 3
        if(isFragment(fragment3)) {
          fragment3.operator.should.equal(TestOperatorType.D);
          fragment3.reference.value.should.equal('HelloWorld');
        } else {
          unreachableCode.should.be.true;
        }
      } else {
        unreachableCode.should.be.true;
      }
      if(isFragment(subFragment1)) {
        subFragment1.operator.should.equal(TestOperatorType.D);
        subFragment1.reference.value.should.equal('HelloWorld');
      } else {
        unreachableCode.should.be.true;
      }
      if(isRecursiveGrouping(subGroup3)) {
        subGroup3.operator.should.equal(TestOperatorType.B);
        subGroup3.group.length.should.equal(1);
        if(isFragment(subGroup3.group[0])) {
          subGroup3.group[0].operator.should.equal(TestOperatorType.A);
          subGroup3.group[0].reference.value.should.equal('HelloWorld');
        } else {
          unreachableCode.should.be.true;
        }
      } else {
        unreachableCode.should.be.true;
      }
      done();
    });
  });
});
