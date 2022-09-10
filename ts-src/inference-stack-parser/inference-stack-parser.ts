import {isPromise} from 'node:util/types';
import {CheckFunction, ExecutionContextI, loadFromModule, LoggerAdapter, TypeOf} from '@franzzemen/app-utility';
import {HasRefName} from '../util/has-ref-name.js';
import {
  RuleElementInstanceReference,
  RuleElementModuleReference,
  RuleElementReference,
  isRuleElementModuleReference,
  isRuleElementInstanceReference
} from '../rule-element-ref/rule-element-reference.js';
import {ScopedFactory} from '../scope/scoped-factory.js';

/**
 * The Inference Stack Parser provides base class behaviors for inference parsing.  Inference parsing is when a parser
 * encounters a construct for which there is no obvious kind or hint and attempts to infer what it is based on
 * constructs already registered.  It does so by calling, in succession, a stack of registered parsers.
 *
 * This class makes few demands on the shape of the actual parsers to be registered by implementations.  They only need to
 * contain a unique "refName" string property.  The parsers that are registered can be module loaded.  As such the
 * ModuleDefinition.LoadSchema or a CheckFunction can be used to validate the shape of the module loaded parser upon load.
 * This can be done either by the implementation class (through an override of addParser... methods), or by a
 * user of the implementation class (no overrides).  The former is recommended.
 */
export abstract class InferenceStackParser<InferenceParser extends HasRefName> implements ScopedFactory<InferenceParser> {
  protected parserInferenceStack: string[] = [];
  protected parserMap = new Map<string, RuleElementReference<InferenceParser>>();

  constructor() {
  }

  /**
   * Parse method implementations need to provide.
   * @param remaining
   * @param scope
   * @param inferredContext
   * @param ec
   */
  abstract parse(remaining: string, scope: Map<string, any>, inferredContext?: any, ec?: ExecutionContextI): [string, any] | Promise<[string, any]>


  /**
   * Add a parser to the end of the stack
   * @param stackedParser Either a parser or a module reference to a parser.  This should meet the implementations version of the parser.
   * If the module reference contains a LoadSchema, it will be used to verify the parser meets the desired shape.
   * @param override Override if it already exists in the stack
   * @param check  A CheckFunction for a parser added through a module reference.  If it exists, will be used instead of any LoadSchema in
   * the module definition.
   * @param paramsArray Any parameters required by factory function or constructor provided in a module definition.
   * @param ec
   * @return The parser added or an existing parser if it exists and override is set to false.  The return value can be synchronous
   * or via Promise.  A Promise is returned if the parser add was through  RuleElementModuleReference and the target import is an ES
   * module, since ES modules can only be loaded dynamically through the asynchronous import().  Commonjs targets do not produce
   * asynchronous loads.
   */
  addParser(stackedParser: InferenceParser | RuleElementModuleReference, override = false, check?: CheckFunction, paramsArray?: any[], ec?: ExecutionContextI): InferenceParser | Promise<InferenceParser> {
    const inferenceParser = this.parserMap.get(stackedParser.refName)?.instanceRef?.instance;
    if (inferenceParser && !override) {
      const log = new LoggerAdapter(ec, 'rules-engine', 'inference-stack-parser', 'addParser');
      log.warn(`Not adding existing parser ${stackedParser.refName} with override = ${override}, returning existing parser`);
      return inferenceParser;
    }
    if (override || inferenceParser === undefined) {
      let ruleElementReferenceOrPromise: RuleElementReference<InferenceParser> | Promise<RuleElementReference<InferenceParser>>;
      if (isRuleElementModuleReference(stackedParser)) {
        ruleElementReferenceOrPromise = this.loadRuleElementReference(stackedParser, check, paramsArray, ec);
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
   * Similar to addParser, but adds it at specific stack index
   * @param stackedParser
   * @param stackIndex
   * @param check
   * @param paramsArray
   * @param ec
   * @return The parser added or an existing parser if it exists and override is set to false.  The return value can be synchronous
   * or via Promise.  A Promise is returned if the parser add was through  RuleElementModuleReference and the target import is an ES
   * module, since ES modules can only be loaded dynamically through the asynchronous import().  Commonjs targets do not produce
   * asynchronous loads.
   */
  addParserAtStackIndex(stackedParser: InferenceParser | RuleElementModuleReference, stackIndex: number, check?: CheckFunction, paramsArray?: any[], ec?: ExecutionContextI): boolean | Promise<boolean> {
    if (this.hasParser(stackedParser.refName)) {
      // Rarely if'ed.  Create log here.
      const log = new LoggerAdapter(ec, 're-common', 'inference-stack-parser', 'addStackedParserAtStackIndex');
      log.warn(`Not adding existing parser ${stackedParser.refName}`);
      return false;
    } else if (isRuleElementModuleReference(stackedParser)) {
      let ruleElementOrPromise = this.loadRuleElementReference(stackedParser, check, paramsArray, ec);
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
      } else {
        return this._addParserAtStackIndexBody(stackedParser, stackIndex, ruleElementOrPromise, ec);
      }
    } else {
      return this._addParserAtStackIndexBody(stackedParser, stackIndex, {
        instanceRef: {
          refName: stackedParser.refName,
          instance: stackedParser
        }
      });
    }
  }

  /**
   * Removes a parser if it finds it
   * @param refName
   * @param ec
   * @return true if the parser existed
   */
  removeParser(refName: string, ec?: ExecutionContextI): boolean {
    const found = this.parserMap.delete(refName);
    if (found) {
      const ndx = this.parserInferenceStack.indexOf(refName);
      this.parserInferenceStack.splice(ndx, 1);
    } else {
      const log = new LoggerAdapter(ec, 're-common', 'inference-stack-parser', 'removeParser');
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

  register(reference: InferenceParser | RuleElementModuleReference | RuleElementInstanceReference<InferenceParser>, override, check?: CheckFunction, paramsArray?: any[], ec?: ExecutionContextI): InferenceParser | Promise<InferenceParser> {
    if (!isRuleElementInstanceReference(reference)) {
      return this.addParser(reference, override = false, check, paramsArray, ec);
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

  private loadRuleElementReference(stackedParser: RuleElementModuleReference, check?: CheckFunction | TypeOf, paramsArray?: any[], ec?: ExecutionContextI): RuleElementReference<InferenceParser> | Promise<RuleElementReference<InferenceParser>> {
    const log = new LoggerAdapter(ec, '@franzzemen/re-common', 'inference-stack-parser', 'loadRuleElementReference');
    if (!stackedParser?.module?.loadSchema && !check) {
      log.warn(stackedParser, `No validation schema, CheckFunction or TypeOf provided`);
    }
    const instanceOrPromise = loadFromModule<InferenceParser>(stackedParser.module, paramsArray, check, ec);
    if (isPromise(instanceOrPromise)) {
      return instanceOrPromise
        .then(instance => {
          return {
            instanceRef: {refName: stackedParser.refName, instance: instance},
            moduleRef: stackedParser
          };
        }, err => {
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
