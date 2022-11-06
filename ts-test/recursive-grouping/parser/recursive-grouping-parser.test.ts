import {ExecutionContext} from '@franzzemen/hints';
import chai from 'chai';
import 'mocha';
import {isPromise} from 'node:util/types';
import {
  Fragment,
  FragmentParser,
  isFragment,
  isRecursiveGrouping,
  ParserMessages,
  RecursiveGroupingParser,
  ResolvedRecursiveGroupingParseResult,
  Scope
} from '../../../publish/index.js';


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

  parse(Fragment: string, scope:Scope, ec?: ExecutionContext): [string, TestReference, ParserMessages] {
    const result = /^(HelloWorld)\s*([^]*)$/.exec(Fragment);
    const ref: TestReference = {value: undefined};
    if (result) {
      ref.value = result[1];
      Fragment = result[2];
    }
    return [Fragment, ref, undefined];
  }
}

class TestRecursiveGroupingParser extends RecursiveGroupingParser<TestOperatorType, TestReference> {
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
    it('should not parse empty string to a reference', () => {
      const recursiveParser = new TestRecursiveGroupingParser();
      // We know there are no promises
      let [remaining, grouping, endCondition]: ResolvedRecursiveGroupingParseResult<TestOperatorType, TestReference> = recursiveParser.parseAndResolve('', scope, operators, TestOperatorType.A, endConditionTests);;
      remaining.should.exist;
      remaining.length.should.equal(0);
      expect(grouping).to.be.undefined;
    });
    it('should not parse empty but not 0 length string " "', () => {
      const recursiveParser = new TestRecursiveGroupingParser();
      let [remaining, grouping] = recursiveParser.parseAndResolve(' ', scope, operators, TestOperatorType.A, endConditionTests, TestOperatorType.A);;
      remaining.should.exist;
      remaining.length.should.equal(0);
      expect(grouping).to.be.undefined;
    });

    it('should parse exactly one Fragment "HelloWorld"', () => {
      const recursiveParser = new TestRecursiveGroupingParser();
      let [remaining, grouping] : ResolvedRecursiveGroupingParseResult<TestOperatorType, TestReference> = recursiveParser.parseAndResolve('HelloWorld', scope, operators, TestOperatorType.A, endConditionTests);
      remaining.should.exist;
      remaining.length.should.equal(0);
      grouping.should.exist;
      if (isPromise(grouping)) {
        unreachableCode.should.true;
      } else {
        grouping.operator.should.equal(TestOperatorType.A);
        grouping.group.length.should.equal(1);
        grouping.group[0].operator.should.equal(TestOperatorType.A);
        if(isFragment(grouping.group[0])) {
          grouping.group[0].reference.value.should.equal('HelloWorld');
        } else {
          unreachableCode.should.be.true;
        }
      }
    });
    it('should parse Fragment followed by extra text delineated by an end condition "HelloWorld << 12345"', () => {
      const recursiveParser = new TestRecursiveGroupingParser();
      let [remaining, grouping, operatorType]:ResolvedRecursiveGroupingParseResult<TestOperatorType, TestReference>= recursiveParser.parseAndResolve('HelloWorld << 12345', scope, operators, TestOperatorType.A, endConditionTests, TestOperatorType.A);;
      remaining.should.exist;
      remaining.should.equal('<< 12345');
      grouping.should.exist;
      if(isPromise(grouping)) {
        unreachableCode.should.be.true;
      } else {
        grouping.operator.should.equal(TestOperatorType.A);
        grouping.group.length.should.equal(1);
        grouping.group[0].operator.should.equal(TestOperatorType.A);
        if (isFragment(grouping.group[0])) {
          (grouping.group[0]).reference.value.should.equal('HelloWorld');
        } else {
          unreachableCode.should.be.true;
        }
      }
    });
    it('should parse Fragment followed by extra text delineated by another end condition "HelloWorld HH 12345"', () => {
      const recursiveParser = new TestRecursiveGroupingParser();
      let [remaining, grouping] = recursiveParser.parseAndResolve('HelloWorld HH 12345', scope, operators, TestOperatorType.A, endConditionTests, TestOperatorType.A);;
      remaining.should.exist;
      remaining.should.equal('HH 12345');
      grouping.should.exist;
      if (isPromise(grouping)) {
        unreachableCode.should.true;
      } else {
        grouping.operator.should.equal(TestOperatorType.A);
        grouping.group.length.should.equal(1);
        grouping.group[0].operator.should.equal(TestOperatorType.A);
        (grouping.group[0] as Fragment<TestOperatorType, TestReference>).reference.value.should.equal('HelloWorld');
      }
    });
    it('should fail on parse bad format (no end condition) "HelloWorld 12345"', () => {
      const recursiveParser = new TestRecursiveGroupingParser();
      try {
        let [remaining, grouping] = recursiveParser.parseAndResolve('HelloWorld 12345', scope, operators, TestOperatorType.A, endConditionTests);;
        unreachableCode.should.be.true;
      } catch (err) {
        err.should.exist;
      }
    });
    it('should parse exactly one sub group with one Fragment "(HelloWorld)"', () => {
      const recursiveParser = new TestRecursiveGroupingParser();
      let [remaining, grouping] = recursiveParser.parseAndResolve('(HelloWorld)', scope, operators, TestOperatorType.A, endConditionTests);;
      remaining.should.exist;
      remaining.should.equal('');
      grouping.should.exist;
      if (isPromise(grouping)) {
        unreachableCode.should.true;
      } else {
        grouping.operator.should.equal(TestOperatorType.A);
        grouping.group.length.should.equal(1);
        let subGroup = grouping.group[0];
        if (isRecursiveGrouping(subGroup)) {
          subGroup.group.length.should.equal(1);
          if (isFragment(subGroup.group[0])) {
            subGroup.group[0].reference.value.should.equal('HelloWorld');
            subGroup.group[0].operator.should.equal(TestOperatorType.A);
          } else {
            unreachableCode.should.be.true;
          }
        } else {
          unreachableCode.should.be.true;
        }
      }
    });
    it('should parse exactly one Sub group with one Fragment and an end condition "(HelloWorld)" << 12345', () => {
      const recursiveParser = new TestRecursiveGroupingParser();
      let [remaining, grouping] = recursiveParser.parseAndResolve('(HelloWorld) << 12345', scope, operators, TestOperatorType.A, endConditionTests);;
      remaining.should.exist;
      remaining.should.equal('<< 12345');
      grouping.should.exist;
      if (isPromise(grouping)) {
        unreachableCode.should.true;
      } else {
        grouping.operator.should.equal(TestOperatorType.A);
        grouping.group.length.should.equal(1);
        let subGroup = grouping.group[0];
        if (isRecursiveGrouping(subGroup)) {
          subGroup.group.length.should.equal(1);
          if (isFragment(subGroup.group[0])) {
            subGroup.group[0].reference.value.should.equal('HelloWorld');
          } else {
            unreachableCode.should.be.true;
          }
        } else {
          unreachableCode.should.be.true;
        }
      }
    });
    it('should parse exactly one subgroup & Fragment with a leading subgroup operator "b (HelloWorld)" << 12345', () => {
      const recursiveParser = new TestRecursiveGroupingParser();
      let [remaining, grouping] = recursiveParser.parseAndResolve('b (HelloWorld) << 12345', scope, operators, TestOperatorType.A, endConditionTests);;
      remaining.should.exist;
      remaining.should.equal('<< 12345');
      grouping.should.exist;
      if (isPromise(grouping)) {
        unreachableCode.should.true;
      } else {
        grouping.operator.should.equal(TestOperatorType.A);
        grouping.group.length.should.equal(1);
        let subGroup = grouping.group[0];
        if (isRecursiveGrouping(subGroup)) {
          subGroup.group.length.should.equal(1);
          subGroup.operator.should.equal(TestOperatorType.B);
          if (isFragment(subGroup.group[0])) {
            subGroup.group[0].reference.value.should.equal('HelloWorld');
            subGroup.group[0].operator.should.equal(TestOperatorType.A);
          } else {
            unreachableCode.should.be.true;
          }
        } else {
          unreachableCode.should.be.true;
        }
      }
    });
    it('should parse exactly one subgroup & Fragment with a leading subgroup operator, Fragment operator "b (c HelloWorld)" << 12345', () => {
      const recursiveParser = new TestRecursiveGroupingParser();
      let [remaining, grouping] = recursiveParser.parseAndResolve('b (c HelloWorld) << 12345', scope, operators, TestOperatorType.A, endConditionTests);;
      remaining.should.exist;
      remaining.should.equal('<< 12345');
      grouping.should.exist;
      if (isPromise(grouping)) {
        unreachableCode.should.true;
      } else {
        grouping.operator.should.equal(TestOperatorType.A);
        grouping.group.length.should.equal(1);
        let subGroup = grouping.group[0];
        if (isRecursiveGrouping(subGroup)) {
          subGroup.group.length.should.equal(1);
          subGroup.operator.should.equal(TestOperatorType.B);
          if (isFragment(subGroup.group[0])) {
            subGroup.group[0].reference.value.should.equal('HelloWorld');
            subGroup.group[0].operator.should.equal(TestOperatorType.C);
          } else {
            unreachableCode.should.be.true;
          }
        } else {
          unreachableCode.should.be.true;
        }
      }
    });
    it('should parse exactly one subgroup with one Fragment along with 2nd Fragment at top level with a leading subgroup operator, Fragment operator "b (c HelloWorld) d HelloWorld" << 12345', () => {
      const recursiveParser = new TestRecursiveGroupingParser();
      let [remaining, grouping] = recursiveParser.parseAndResolve('b (c HelloWorld) d HelloWorld << 12345', scope, operators, TestOperatorType.A, endConditionTests);;
      remaining.should.exist;
      remaining.should.equal('<< 12345');
      grouping.should.exist;
      if (isPromise(grouping)) {
        unreachableCode.should.true;
      } else {
        grouping.operator.should.equal(TestOperatorType.A);
        grouping.group.length.should.equal(2);
        let subGroup = grouping.group[0];
        if (isRecursiveGrouping(subGroup)) {
          subGroup.group.length.should.equal(1);
          subGroup.operator.should.equal(TestOperatorType.B);
          if (isFragment(subGroup.group[0])) {
            subGroup.group[0].reference.value.should.equal('HelloWorld');
            subGroup.group[0].operator.should.equal(TestOperatorType.C);
          } else {
            unreachableCode.should.be.true;
          }
        } else {
          unreachableCode.should.be.true;
        }
        let Fragment = grouping.group[1];
        if (isFragment(Fragment)) {
          Fragment.operator.should.equal(TestOperatorType.D);
          Fragment.reference.value.should.equal('HelloWorld');
        } else {
          unreachableCode.should.be.true;
        }
      }
    });
    it('should parse complex "b (c HelloWorld b HelloWorld a (d HelloWorld) d HelloWorld) d HelloWorld b (HelloWorld) << 12345"', () => {
      const recursiveParser = new TestRecursiveGroupingParser();
      let [remaining, grouping] = recursiveParser.parseAndResolve('b (c HelloWorld b HelloWorld a (d HelloWorld) d HelloWorld) d HelloWorld b (HelloWorld) << 12345', scope, operators, TestOperatorType.A, endConditionTests);;
      remaining.should.exist;
      remaining.should.equal('<< 12345');
      grouping.should.exist;
      if (isPromise(grouping)) {
        unreachableCode.should.true;
      } else {
        grouping.operator.should.equal(TestOperatorType.A);
        grouping.group.length.should.equal(3);
        let subGroup1 = grouping.group[0]; // b (c HelloWorld b HelloWorld a (d HelloWorld) d HelloWorld)
        let subFragment1 = grouping.group[1]; // d HelloWorld
        let subGroup3 = grouping.group[2]; // b (HelloWorld)

        // Subgroup 1
        if (isRecursiveGrouping(subGroup1)) {
          subGroup1.group.length.should.equal(4);
          subGroup1.operator.should.equal(TestOperatorType.B);
          let fragment1 = subGroup1.group[0];
          let fragment2 = subGroup1.group[1];
          let subSubGroup = subGroup1.group[2];
          let fragment3 = subGroup1.group[3];
          // Fragment 1
          if (isFragment(fragment1)) {
            fragment1.operator.should.equal(TestOperatorType.C);
            fragment1.reference.value.should.equal('HelloWorld');
          } else {
            unreachableCode.should.be.true;
          }
          // Fragment 2
          if (isFragment(fragment2)) {
            fragment2.operator.should.equal(TestOperatorType.B);
            fragment2.reference.value.should.equal('HelloWorld');
          } else {
            unreachableCode.should.be.true;
          }
          // subSubGroup
          if (isRecursiveGrouping(subSubGroup)) {
            subSubGroup.operator.should.equal(TestOperatorType.A);
            subSubGroup.group.length.should.equal(1);
            subSubGroup.group[0].operator.should.equal(TestOperatorType.D);
            if (isFragment(subSubGroup.group[0])) {
              subSubGroup.group[0].reference.value.should.equal('HelloWorld');
            } else {
              unreachableCode.should.be.true;
            }
          } else {
            unreachableCode.should.be.true;
          }
          // Fragment 3
          if (isFragment(fragment3)) {
            fragment3.operator.should.equal(TestOperatorType.D);
            fragment3.reference.value.should.equal('HelloWorld');
          } else {
            unreachableCode.should.be.true;
          }
        } else {
          unreachableCode.should.be.true;
        }
        if (isFragment(subFragment1)) {
          subFragment1.operator.should.equal(TestOperatorType.D);
          subFragment1.reference.value.should.equal('HelloWorld');
        } else {
          unreachableCode.should.be.true;
        }
        if (isRecursiveGrouping(subGroup3)) {
          subGroup3.operator.should.equal(TestOperatorType.B);
          subGroup3.group.length.should.equal(1);
          if (isFragment(subGroup3.group[0])) {
            subGroup3.group[0].operator.should.equal(TestOperatorType.A);
            subGroup3.group[0].reference.value.should.equal('HelloWorld');
          } else {
            unreachableCode.should.be.true;
          }
        } else {
          unreachableCode.should.be.true;
        }
      }
    });
  });
});
