import {isPromise} from 'node:util/types';
import {ExecutionContextI, loadFromModule, LoggerAdapter} from '@franzzemen/app-utility';
import {HasRefName} from '../util/has-ref-name.js';
import {
  RuleElementInstanceReference,
  RuleElementModuleReference,
  RuleElementReference,
  isRuleElementModuleReference,
  isRuleElementInstanceReference
} from '../rule-element-ref/rule-element-reference.js';
import {ScopedFactory} from '../scope/scoped-factory.js';


export abstract class InferenceStackParser<InferenceParser extends HasRefName> implements ScopedFactory<InferenceParser> {
  protected parserInferenceStack: string[] = [];
  protected parserMap = new Map<string, RuleElementReference<InferenceParser>>();

  constructor() {
  }

  abstract parse(remaining: string, scope: Map<string, any>, inferredContext?: any, ec?: ExecutionContextI): [string, any];

  /**
   * Adds a parser
   * @param stackedParser The parser to add.  If it exists, it does not replace the existing one.
   * @param override
   * @param ec
   */
  addParser(stackedParser: InferenceParser | RuleElementModuleReference, override = false, ec?: ExecutionContextI): InferenceParser | Promise<InferenceParser> {
    const inferenceParser = this.parserMap.get(stackedParser.refName)?.instanceRef?.instance;
    if (inferenceParser && !override) {
      const log = new LoggerAdapter(ec, 'rules-engine', 'inference-stack-parser', 'addParser');
      log.warn(`Not adding existing parser ${stackedParser.refName} with override = ${override}, returning existing parser`);
      return inferenceParser;
    }
    if (override || inferenceParser === undefined) {
      let ruleElementReferenceOrPromise: RuleElementReference<InferenceParser> | Promise<RuleElementReference<InferenceParser>>;
      if(isRuleElementModuleReference(stackedParser)) {
        ruleElementReferenceOrPromise = this.loadRuleElementReference(stackedParser);
      } else {
        ruleElementReferenceOrPromise = {instanceRef: {instance: stackedParser, refName: stackedParser.refName}};
      }
      if (isPromise(ruleElementReferenceOrPromise)) {
        return ruleElementReferenceOrPromise
          .then(ruleElement => {
            // Add whether override or new (not had)
            this.parserMap.set(stackedParser.refName, ruleElement);
            if (!inferenceParser) {
              // Add only if new (it's already there for an overrider)
              this.parserInferenceStack.push(stackedParser.refName);
            }
            return ruleElement.instanceRef.instance;
          }, err => {
            const log = new LoggerAdapter(ec, 're-re-common', 'inference-stack-parser', 'addParser');
            log.error(err);
            throw err;
          });
      } else {
        // Add whether override or new (not had)
        this.parserMap.set(stackedParser.refName, ruleElementReferenceOrPromise);
        if (!inferenceParser) {
          // Add only if new (it's already there for an overrider)
          this.parserInferenceStack.push(stackedParser.refName);
        }
        return ruleElementReferenceOrPromise.instanceRef.instance;
      }
    } else {
      return inferenceParser;
    }
  }

  hasParser(refName: string, execContext?: ExecutionContextI): boolean {
    if (refName) {
      return this.parserMap.has(refName);
    } else {
      return false;
    }
  }

  getParser(refName: string, ec?: ExecutionContextI): InferenceParser {
    return this.parserMap.get(refName).instanceRef.instance;
  }

  /**
   * Adds a stacked parser at a specific index.  If it already exists, it does not replace the existing one.
   * Also, the stackIndex is relative to the current stack (important to note if it already exists and the new position
   * is after the current position).
   * @param stackedParser
   * @param stackIndex
   * @param ec
   * @return true if added
   */
  addParserAtStackIndex(stackedParser: InferenceParser | RuleElementModuleReference, stackIndex: number, ec?: ExecutionContextI): boolean | Promise<boolean> {
    if (this.hasParser(stackedParser.refName)) {
      // Rarely if'ed.  Create log here.
      const log = new LoggerAdapter(ec, 're-common', 'inference-stack-parser', 'addStackedParserAtStackIndex');
      log.warn(`Not adding existing parser ${stackedParser.refName}`);
      return false;
    } else if(isRuleElementModuleReference(stackedParser)) {
      let ruleElementOrPromise = this.loadRuleElementReference(stackedParser);
      if (isPromise(ruleElementOrPromise)) {
        return ruleElementOrPromise
          .then(ruleElement => {
            return this._addParserAtStackIndexBody(stackedParser, stackIndex, ruleElement, ec);
          }, err => {
            // Rare for error, create log here.
            const log = new LoggerAdapter(ec, 're-common', 'inference-stack-parser', 'addStackedParserAtStackIndex');
            log.error(err);
            throw err;
          });
      }
      else {
        return this._addParserAtStackIndexBody(stackedParser, stackIndex, ruleElementOrPromise, ec);
      }
    } else {
      return this._addParserAtStackIndexBody(stackedParser, stackIndex, {instanceRef:{refName: stackedParser.refName, instance: stackedParser}});
    }
  }

  /**
   * Removes a parser if it finds it
   * @param refName
   * @param execContext
   * @return true if the parser existed
   */
  removeParser(refName: string, execContext?: ExecutionContextI): boolean {
    const found = this.parserMap.delete(refName);
    if (found) {
      const ndx = this.parserInferenceStack.indexOf(refName);
      this.parserInferenceStack.splice(ndx, 1);
    } else {
      const log = new LoggerAdapter(execContext, 're-common', 'inference-stack-parser', 'removeParser');
      log.warn(`Parser ${refName} not found to remove, ignoring`);
    }
    return found;
  }

  /**
   * Get a copy of the inference stack
   * @param execContext
   */
  getInferenceStack(execContext?: ExecutionContextI): string[] {
    const inferenceStack: string[] = [];
    this.parserInferenceStack.forEach(inference => inferenceStack.push(inference));
    return inferenceStack;
  }

  /**
   * Sets the new inference stack.  Every entry of the new inference stack must exist and everything that exists
   * must exist in the inbound inferenceStack.  The inference stack is copied into a new array
   * @param inferenceStack
   * @param execContext
   */
  orderInferenceStack(inferenceStack: string[], execContext?: ExecutionContextI) {
    // All the inference refs must be already loaded.
    if (inferenceStack.every(newInference => {
      if (!this.parserMap.has(newInference)) {
        const log = new LoggerAdapter(execContext, 're-common', 'inference-stack-parser', 'setInferenceStack');
        log.warn(`inference ${newInference} was not previously loaded`);
        return false;
      } else return true;
    })) {
      this.parserInferenceStack = [];
      inferenceStack.forEach(newInference => {
        this.parserInferenceStack.push(newInference);
      });
    } else {
      const log = new LoggerAdapter(execContext, 're-common', 'inference-stack-parser', 'setInferenceStack');
      log.warn({inferenceStack, existingStack: this.parserInferenceStack}, 'Mismatch in stack contents');
      const err = new Error(`Mismatch in stack contents`);
      log.error(err);
      throw err;
    }
  }

  register(reference: InferenceParser | RuleElementModuleReference | RuleElementInstanceReference<InferenceParser>, override, execContext?: ExecutionContextI, ...params): InferenceParser | Promise<InferenceParser> {
    if (!isRuleElementInstanceReference(reference)) {
      return this.addParser(reference, override = false, execContext);
    } else {
      throw new Error('Not applicable');
    }
  }

  unregister(refName: string, execContext?: ExecutionContextI): boolean {
    return this.removeParser(refName, execContext);
  }

  hasRegistered(refName: string, execContext?: ExecutionContextI): boolean {
    return this.hasParser(refName, execContext);
  }

  getRegistered(refName: string, ec?: ExecutionContextI): InferenceParser {
    return this.getParser(refName, ec);
  }

  private loadRuleElementReference(stackedParser: RuleElementModuleReference, ec?: ExecutionContextI): RuleElementReference<InferenceParser> | Promise<RuleElementReference<InferenceParser>> {
    const instanceOrPromise = loadFromModule<InferenceParser>(stackedParser.module, undefined, undefined, ec);
    if (isPromise(instanceOrPromise)) {
      return instanceOrPromise
        .then(instance => {
          return {
            instanceRef: {refName: stackedParser.refName, instance: instance},
            moduleRef: stackedParser
          };
        }, err => {
          const log = new LoggerAdapter(ec, '@franzzemen/re-common', 'inference-stack-parser', 'getRuleElement');
          log.error(err);
          throw err;
        });
    } else {
      return {
        instanceRef: {refName: stackedParser.refName, instance: instanceOrPromise},
        moduleRef: stackedParser
      };
    }
  }

  private _addParserAtStackIndexBody(stackedParser: InferenceParser | RuleElementModuleReference, stackIndex: number, ruleElement: RuleElementReference<InferenceParser>, ec?: ExecutionContextI): boolean {
    if (stackIndex >= 0 && stackIndex <= this.parserInferenceStack.length) {
      this.parserMap.set(stackedParser.refName, ruleElement);
      if (stackIndex === this.parserInferenceStack.length) {
        this.parserInferenceStack.push(stackedParser.refName);
      } else {
        this.parserInferenceStack.splice(stackIndex, 0, stackedParser.refName);
      }
      return true;
    } else {
      const log = new LoggerAdapter(ec, 're-common', 'inference-stack-parser', '_addParserAtStackIndexBody');
      const err = new Error(`Attempt to add stacked parser ${stackedParser.refName} at position ${stackIndex} outside of stack size`);
      log.error(err);
      throw err;
    }
  }
}
