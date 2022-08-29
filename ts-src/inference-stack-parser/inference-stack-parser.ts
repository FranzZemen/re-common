import {ExecutionContextI, loadFromModule, LoggerAdapter} from '@franzzemen/app-utility';
import {HasRefName} from '../util/has-ref-name';
import {RuleElementInstanceReference, RuleElementModuleReference, RuleElementReference, isRuleElementModuleReference, isRuleElementInstanceReference} from '../rule-element-ref/rule-element-reference'
import {ScopedFactory} from '../scope/scoped-factory';




export abstract class InferenceStackParser<InferenceParser extends HasRefName> implements ScopedFactory<InferenceParser> {
  protected parserInferenceStack: string[] = [];
  protected parserMap = new Map<string, RuleElementReference<InferenceParser>>();

  constructor() {
  }

  abstract parse(remaining: string, scope: Map<string, any>, inferredContext?: any, execContext?: ExecutionContextI):[string, any];

  private getRuleElement(stackedParser: InferenceParser | RuleElementModuleReference): RuleElementReference<InferenceParser> {
    let ruleElement: RuleElementReference<InferenceParser>;
    if(isRuleElementModuleReference(stackedParser)) {
      const instance:InferenceParser = loadFromModule<InferenceParser>(stackedParser.module);
      ruleElement = {
        instanceRef: {refName: stackedParser.refName, instance: instance},
        moduleRef: stackedParser
      }
    } else {
      ruleElement = {instanceRef: {refName: stackedParser.refName, instance: stackedParser}};
    }
    return ruleElement;
  }

  /**
   * Adds a parser
   * @param stackedParser The parser to add.  If it exists, it does not replace the existing one.
   * @param override
   * @param execContext
   * @return true if it added the parser
   */
  addParser(stackedParser: InferenceParser | RuleElementModuleReference, override = false, execContext?: ExecutionContextI): InferenceParser {
    let ruleElement = this.getRuleElement(stackedParser);
    let had = false;

    if (this.parserMap.has(stackedParser.refName)) {
      had = true;
      if (!override) {
        const log = new LoggerAdapter(execContext, 'rules-engine', 'inference-stack-parser', 'addParser');
        log.warn(`Not adding existing parser ${stackedParser.refName}`);
        return undefined;
      }
    }
    if(override || !had) {
      this.parserMap.set(stackedParser.refName, ruleElement);
      if (!had) {
        // We'd only get here if it didn't exist yet, so push it.
        this.parserInferenceStack.push(stackedParser.refName);
      } else {
        // It's already in the inference stack
        const log = new LoggerAdapter(execContext, 're-re-common', 'inference-stack-parser', 'addParser');
        log.warn(`Attempt to add parser ${stackedParser.refName}.  It already exists and override is ${override}`);
      }
    }
    return ruleElement.instanceRef.instance;
  }

  hasParser(refName: string, execContext?: ExecutionContextI): boolean {
    if(refName) {
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
   * @param execContext
   * @return true if added
   */
  addParserAtStackIndex(stackedParser: InferenceParser | RuleElementModuleReference, stackIndex: number, execContext?: ExecutionContextI): boolean {
    const log = new LoggerAdapter(execContext, 're-common', 'inference-stack-parser', 'addStackedParserAtStackIndex');
    if (this.parserMap.has(stackedParser.refName)) {
      const log = new LoggerAdapter(execContext, 're-common', 'inference-stack-parser', 'addStackedParserAtStackIndex');
      log.warn(`Not adding existing parser ${stackedParser.refName}`);
      return false;
    }
    let ruleElement = this.getRuleElement(stackedParser);
    if(stackIndex >= 0 && stackIndex <= this.parserInferenceStack.length) {
      this.parserMap.set(stackedParser.refName, ruleElement);
      if(stackIndex === this.parserInferenceStack.length) {
        this.parserInferenceStack.push(stackedParser.refName);
      } else {
        this.parserInferenceStack.splice(stackIndex, 0, stackedParser.refName);
      }
    } else {
      const log = new LoggerAdapter(execContext, 're-common', 'inference-stack-parser', 'addStackedParserAtStackIndex');
      const err = new Error(`Attempt to add stacked parser ${stackedParser.refName} at position ${stackIndex} outside of stack size`);
      log.error(err);
      throw err;
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
    if(found) {
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
    if(inferenceStack.every(newInference => {
      if(!this.parserMap.has(newInference)) {
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

  
  register(reference: InferenceParser | RuleElementModuleReference | RuleElementInstanceReference<InferenceParser>, override, execContext?: ExecutionContextI, ...params): InferenceParser {
    if(!isRuleElementInstanceReference(reference)) {
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
}
