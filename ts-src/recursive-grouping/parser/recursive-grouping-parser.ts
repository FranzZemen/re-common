import {ExecutionContextI, LoggerAdapter, ModuleResolver} from '@franzzemen/app-utility';
import {EnhancedError, logErrorAndThrow} from '@franzzemen/app-utility/enhanced-error.js';
import {isPromise} from 'node:util/types';
import {Scope} from '../../scope/scope.js';
import {Fragment, RecursiveGrouping} from '../recursive-grouping.js';
import {FragmentParser} from './fragment-parser.js';


export enum EndConditionType {
  Noop = 'Noop',
  CurrentGroupingEnd = 'Current Grouping End',
  GroupingEnd = 'Grouping End',
  InputEnd = 'Input End'
}


export type RecursiveGroupingParseResult<OperatorType, Reference> = [remaining: string, grouping: RecursiveGrouping<OperatorType, Reference>, endCondition: EndConditionType];
export type ResolvedRecursiveGroupingParseResult<OperatorType, Reference> =
  RecursiveGroupingParseResult<OperatorType, Reference> | [remaining: string, groupingPromise: Promise<RecursiveGrouping<OperatorType, Reference>>, endCondition: EndConditionType];




export class RecursiveGroupingParser<OperatorType, Reference> {
  constructor(private fragmentParser: FragmentParser<Reference>) {
  }


  parseAndResolve (text: string,
                   scope: Scope,
                   operators: OperatorType[],
                   defaultOperator: OperatorType,
                   endConditionTests: RegExp[],
                   groupOperator?: OperatorType,
                   ec?: ExecutionContextI): ResolvedRecursiveGroupingParseResult<OperatorType, Reference> {


    const log = new LoggerAdapter(ec, 're-common', 'recursive-grouping-parser', 'parseAndResolve');
    const result: RecursiveGroupingParseResult<OperatorType, Reference> = this.parse(text, scope, operators, defaultOperator, endConditionTests, groupOperator, ec);
    const [remaining, grouping, endCondition] = result;
    const trueValOrPromise = Scope.resolve(scope, ec);

    if (isPromise(trueValOrPromise)) {
      const groupingPromise = trueValOrPromise
        .then(truVal => {
          return grouping;
        })
      return [remaining, groupingPromise, endCondition];
    }  else {
      return [remaining, grouping, endCondition];
    }
  }

  /**
   *
   * @param moduleResolver
   * @param text
   * @param scope
   * @param operators
   * @param defaultOperator
   * explicitly defined in the text if not the outermost group.  Consider A or (B and C).   The sub-group (B and C)
   * has an explicity operator "or".  "or" is parsed at outermost group level that contains A or (B and C), so it is
   * naturally passed in.  The unique condition of the outermost group level is that it does not have an operator.  If
   * this value is undefined, the default operator will be used (which is usual).  For readability, it is encouraged
   * to use the actual desired value for the outermost operator even if it is the default.
   * @param endConditionTests
   * @param groupOperator
   * @param ec
   * @return If the RecursiveGrouping is undefined, an end condition was immediately encountered and processing should proceed with that info
   */
  parse(text: string,
        scope: Map<string, any>,
        operators: OperatorType[],
        defaultOperator: OperatorType,
        endConditionTests: RegExp[],
        groupOperator?: OperatorType,
        ec?: ExecutionContextI): RecursiveGroupingParseResult<OperatorType, Reference> {

    const log = new LoggerAdapter(ec, 're-common', 'recursive-grouping-parser', 'parse');
    let operator = groupOperator;
    if (!operator) {
      operator = defaultOperator;
    }

    // Immediate test end conditions
    let [remaining, endCondition] = this.testEndCondition(text, endConditionTests, ec);
    if (endCondition !== EndConditionType.Noop) {
      return [remaining, undefined, endCondition];
    }

    const thisGroup: RecursiveGrouping<OperatorType, Reference> = {group: [], operator};
    // Iterate at this level, and recurse when a sub group is encountered.
    // Stop when and end condition is encountered
    while (remaining.length) {
      // Get the operator either for the next subgroup or the next fragment.  If it will be the FIRST one in "this" group
      // allow the default to be added.  It would be an error condition for an inner group or fragment not to heave an operator
      // in the text.
      let subGroupOperator: OperatorType;
      [remaining, subGroupOperator] = this.parseOperator(remaining, operators, thisGroup.group.length === 0, defaultOperator, ec);

      // Test and consume a nested group opening bracket
      const subGroupResult = /^\(([^]*)$/.exec(remaining);
      if (subGroupResult) {
        remaining = subGroupResult[1].trim();
        let subGroup: RecursiveGrouping<OperatorType, Reference>;
        [remaining, subGroup, endCondition] = this.parse(remaining, scope, operators, defaultOperator, endConditionTests, subGroupOperator, ec);

        if (subGroup) {
          thisGroup.group.push(subGroup);
        } else {
          logErrorAndThrow(new EnhancedError('Unexpected undefined processing sub-group'), log, ec);
        }
        // We continue until we find an end to all the grouping, or end of input.  End of sub group just means wthat we move
        // to the next sub group or fragment in this group.
        if (endCondition === EndConditionType.GroupingEnd || endCondition === EndConditionType.InputEnd) {
          break;
        }
      } else {
        let reference: Reference;
        [remaining, reference] = this.fragmentParser.parse(remaining, scope, ec);
        if (reference) {
          const fragment: Fragment<OperatorType, Reference> = {operator: subGroupOperator, reference};
          thisGroup.group.push(fragment);
        } else {
          logErrorAndThrow(new EnhancedError('Unexpected undefined processing fragment'), log, ec);
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
    return [remaining, thisGroup, endCondition];
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
