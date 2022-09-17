import {ExecutionContextI, LoggerAdapter} from '@franzzemen/app-utility';
import {EnhancedError, logErrorAndReturn, logErrorAndThrow} from '@franzzemen/app-utility/enhanced-error.js';
import {isPromise} from 'node:util/types';
import {FragmentParser} from './fragment-parser.js';
import {Fragment, isRecursiveGrouping, isRecursiveGroupingOrAny, RecursiveGrouping} from '../recursive-grouping.js';




export class RecursiveGroupingParser<OperatorType, Reference> {
  constructor(private fragmentParser: FragmentParser<Reference>) {
  }

  /**
   *
   * @param text
   * @param scope
   * @param operators
   * @param defaultOperator
   * @param groupOperator this is the operator that that is assigned to the group as a whole.  It will always be
   * explicitly defined in the text if not the outermost group.  Consider A or (B and C).   The sub-group (B and C)
   * has an explicity operator "or".  "or" is parsed at outermost group level that contains A or (B and C), so it is
   * naturally passed in.  The unique condition of the outermost group level is that it does not have an operator.  If
   * this value is undefined, the default operator will be used (which is usual).  For readability, it is encouraged
   * to use the actual desired value for the outermost operator even if it is the default.
   * @param endConditionTests
   * @param ec
   * @return If the RecursiveGrouping is undefined, an end condition was immediately encountered and processing should proceed with that info
   */
  parse(text: string,
        scope: Map<string, any>,
        operators: OperatorType[],
        defaultOperator: OperatorType,
        endConditionTests: RegExp[],
        ec?: ExecutionContextI): [string, RecursiveGrouping<OperatorType, Reference> | Promise<RecursiveGrouping<OperatorType, Reference>>, EndConditionType];
  parse(text: string,
        scope: Map<string, any>,
        operators: OperatorType[],
        defaultOperator: OperatorType,
        endConditionTests: RegExp[],
        groupOperator: OperatorType,
        ec?: ExecutionContextI): [string, RecursiveGrouping<OperatorType, Reference> | Promise<RecursiveGrouping<OperatorType, Reference>>, EndConditionType];
  parse(text: string,
        scope: Map<string, any>,
        operators: OperatorType[],
        defaultOperator: OperatorType,
        endConditionTests: RegExp[],
        groupOperator?: OperatorType,
        ec?: ExecutionContextI): [string, RecursiveGrouping<OperatorType, Reference> | Promise<RecursiveGrouping<OperatorType, Reference>>, EndConditionType] {
    let operator = groupOperator;
    if (!operator) {
      operator = defaultOperator;
    }
    const log = new LoggerAdapter(ec, 're-common', 'recursive-grouping-parser', 'parse');
    const [remaining, groupsResultsOrPromises, endCondition, fragmentOperators] = this._recursion(text, scope, operators, defaultOperator, endConditionTests, groupOperator, ec);
    if(groupsResultsOrPromises === undefined) {
      return [remaining, undefined, endCondition];
    }
    const async = groupsResultsOrPromises.some(groupResult => isPromise(groupResult));
    if (async) {
      const groupingsPromise: Promise<RecursiveGrouping<OperatorType, Reference>> = Promise.all(groupsResultsOrPromises)
        .then(groupResults => {
          const thisGroup: RecursiveGrouping<OperatorType, Reference> = {group: [], operator};
          groupResults.forEach((groupResult,ndx) => {
            if (isRecursiveGroupingOrAny(groupResult)) {
              thisGroup.group.push(groupResult);
              } else {
              const fragment: Fragment<OperatorType, Reference> = {operator: fragmentOperators[ndx], reference: groupResult};
              thisGroup.group.push(fragment);
            }
          });
          return thisGroup;
        })
      return [remaining, groupingsPromise, endCondition];
    } else {
      const thisGroup: RecursiveGrouping<OperatorType, Reference> = {group: [], operator};
      groupsResultsOrPromises.forEach((groupResult, ndx) => {
        if (isPromise(groupResult)) {
          logErrorAndThrow(new EnhancedError('Promise not possible here'), log, ec);
        } else {
          if (isRecursiveGroupingOrAny(groupResult)) {
            thisGroup.group.push(groupResult);
          } else {
            const fragment: Fragment<OperatorType, Reference> = {operator: fragmentOperators[ndx], reference: groupResult};
            thisGroup.group.push(fragment);
          }
        }
      });
      return [remaining, thisGroup, endCondition];
    }
  }


  private _recursion(text: string,
                     scope: Map<string, any>,
                     operators: OperatorType[],
                     defaultOperator: OperatorType,
                     endConditionTests: RegExp[],
                     groupOperator?: OperatorType,
                     ec?: ExecutionContextI)
    :[string, (Reference | Promise<Reference> | RecursiveGrouping<OperatorType, Reference> | Promise<RecursiveGrouping<OperatorType, Reference>>)[], EndConditionType, OperatorType[]] {

    const log = new LoggerAdapter(ec, 're-common', 'recursive-grouping-parser', '_recursion');
    // Immediate test end conditions
    let [remaining, endCondition] = this.testEndCondition(text, endConditionTests, ec);
    if (endCondition !== EndConditionType.Noop) {
      return [remaining,  undefined, endCondition, undefined];
    }

    let subGroups: (Reference | Promise<Reference> | RecursiveGrouping<OperatorType, Reference> | Promise<RecursiveGrouping<OperatorType, Reference>>)[] = [];
    let fragmentOperators: OperatorType[] = [];
    // Iterate at this level, and recurse when a sub group is encountered.
    // Stop when and end condition is encountered
    while (remaining.length) {
      // Get the operator either for the next subgroup or the next fragment.  If it will be the FIRST one in "this" group
      // allow the default to be added.  It would be an error condition for an inner group or fragment not to heave an operator
      // in the text.
      let operator: OperatorType;
      [remaining, operator] = this.parseOperator(remaining, operators, subGroups.length === 0, defaultOperator, ec);
      // Possibilities:
      // a) We won't immediately hit an end condition, because we just checked for that
      // 1. We encounter a sub-group (starts with '(').  We recurse on it and add it to the thisGroup (even if it is the "only"
      // subgroup, which would be the trivial case)
      // 2. We encounter a Fragment.  We parse it and add it to thisGroup

      // Test and consume a nested group opening bracket
      const subGroupResult = /^\(([^]*)$/.exec(remaining);
      if (subGroupResult) {
        fragmentOperators.push(undefined);
        remaining = subGroupResult[1].trim();
        let subGroup: RecursiveGrouping<OperatorType, Reference> | Promise<RecursiveGrouping<OperatorType, Reference>>;

        [remaining, subGroup, endCondition] = this.parse(remaining, scope, operators, defaultOperator, endConditionTests, operator, ec);

        if (subGroup) {
          subGroups.push(subGroup);
        }
        // We continue until we find an end to all the grouping, or end of input.  End of sub group just means wthat we move
        // to the next sub group or fragment in this group.
        if (endCondition === EndConditionType.GroupingEnd || endCondition === EndConditionType.InputEnd) {
          break;
        }
      } else {
        fragmentOperators.push(operator);
        let reference: Reference | Promise<Reference>;
        [remaining, reference] = this.fragmentParser.parse(remaining, scope, ec);
        if (reference) {
          subGroups.push(reference);
        }
        // Check end condition
        [remaining, endCondition] = this.testEndCondition(remaining, endConditionTests, ec);
        if (endCondition !== EndConditionType.Noop) {
          break;
        }
      }
      [remaining, endCondition] = this.testEndCondition(remaining, endConditionTests, ec);
      if (endCondition !== EndConditionType.Noop) {
        break;
      }
    }
    return [remaining, subGroups, endCondition, fragmentOperators];
  }

  /**
   * Tests for an end condition. If the end condition is the end of the current grouping (due to closing bracket) the closing
   * bracket is consumed.
   * @param text
   * @param endConditions
   * @param ec
   * @return CurrentGroupingEnd means we encountered a closing bracket, GroupingEnd means we encountered a tested end
   * condition, and InputEnd means we're at the end of the text
   */
  testEndCondition(text: string, endConditions: RegExp[], ec?: ExecutionContextI): [string, EndConditionType] {
    text = text.trim();
    if (text.length === 0) {
      return [text, EndConditionType.InputEnd];
    }
    const currentGroupingEndResult = /^\)([^]*)$/.exec(text);
    if (currentGroupingEndResult) {
      return [currentGroupingEndResult[1].trim(), EndConditionType.CurrentGroupingEnd];
    }
    if (endConditions.some(regExp => regExp.test(text))) {
      return [text, EndConditionType.GroupingEnd];
    }
    return [text, EndConditionType.Noop];
  }

  /**
   * Parses text for the next operator
   * @param text
   * @param operators Note that the first to match will be matched, so this should be in proper sorted order
   * @param addDefault
   * @param defaultOperator
   * @param ec
   * @return the remaining text after removing the operator and trailing white space as well as the operator OR
   * the original text and undefined if it does nto find an operator
   */
  parseOperator(text, operators: OperatorType[], addDefault: boolean, defaultOperator: OperatorType, ec?: ExecutionContextI): [string, OperatorType] {
    const log = new LoggerAdapter(ec, 'rules-engine', 'recursive-grouping-parser', RecursiveGroupingParser.name + 'parseOperator');
    // Operators are bounded by whitespace (but text will be trimmed at least on the start side...however
    // the end of the operator must have whitespace before any further text
    for (let i = 0; i < operators.length; i++) {
      const result = (new RegExp(`^${operators[i]}[\\s\\t\\r\\n\\v\\f\u2028\u2029]+([^]+)$`)).exec(text);
      if (result) {
        return [result[1].trim(), operators[i]];
      }
    }
    // if we've made it this far, there is no operator, so go with the default (first in the list) if instructed to do so
    // Otherwise throw an exception for not finding the operator
    if (addDefault) {
      return [text, defaultOperator];
    } else {
      const err = new Error(`Expected operator near ${text}`);
      logErrorAndThrow(err, log, ec);
    }
  }
}

export enum EndConditionType {
  Noop = 'Noop',
  CurrentGroupingEnd = 'Current Grouping End',
  GroupingEnd = 'Grouping End',
  InputEnd = 'Input End'
}
