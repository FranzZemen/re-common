import {
  CheckFunction,
  ExecutionContextI,
  loadFromModule,
  LoadPackageType,
  LoggerAdapter, ModuleResolutionResult,
  ModuleResolutionSetter,
  ModuleResolver,
  TypeOf
} from '@franzzemen/app-utility';
import {EnhancedError, logErrorAndReturn, logErrorAndThrow} from '@franzzemen/app-utility/enhanced-error.js';
import {ModuleResolutionSetterInvocation} from '@franzzemen/app-utility/module-resolver.js';
import {isPromise} from 'node:util/types';
import {
  isRuleElementInstanceReference,
  isRuleElementModuleReference,
  RuleElementInstanceReference,
  RuleElementModuleReference,
  RuleElementReference
} from '../rule-element-ref/rule-element-reference.js';
import {ScopedFactory} from '../scope/scoped-factory.js';
import {HasRefName} from '../util/has-ref-name.js';

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
   * @return The remaining text, the result or a promise to it, and arbitrary other object, if needed.
   */
  abstract parse(remaining: string, scope: Map<string, any>, inferredContext?: any, ec?: ExecutionContextI): [string, any | Promise<any>, any?];

  resolveAddParser: ModuleResolutionSetterInvocation = (refName: string, parser: InferenceParser, resolutionResult?: ModuleResolutionResult, ec?: ExecutionContextI) => {
    const inferenceParser = this.parserMap.get(refName)?.instanceRef?.instance;
    this.parserMap.set(refName, {instanceRef: {instance:parser, refName: refName}});
    if(!inferenceParser) {
      this.parserInferenceStack.push(refName);
    }
    return true;
  }

  resolveAddParserAtStackIndex: ModuleResolutionSetterInvocation = (refName: string, parser: InferenceParser, resolutionResult: ModuleResolutionResult, ndx: number, ec?: ExecutionContextI) => {
    const ruleElementRef: RuleElementReference<InferenceParser> = {
      instanceRef: {
        refName: refName,
        instance: parser
      },
      moduleRef: {
        refName: refName,
        module: resolutionResult.resolution.loader.module
      }
    }
    try {
      this._addParserAtStackIndexBody(parser, ndx, ruleElementRef, ec);
      return true;
    } catch (err) {
      logErrorAndThrow(err, new LoggerAdapter(ec, 're-common', 'inference-stack-parser', 'resoloveAddParserAtStackIndex'), ec);
    }
  }


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
  addParser(stackedParser: InferenceParser | RuleElementModuleReference, override = false, ec?: ExecutionContextI): InferenceParser | Promise<InferenceParser> {
    const log = new LoggerAdapter(ec, 're-common', 'inference-stack-parse', 'addParser');
    const inferenceParser = this.parserMap.get(stackedParser.refName)?.instanceRef?.instance;
    if (inferenceParser && !override) {
      const log = new LoggerAdapter(ec, 'rules-engine', 'inference-stack-parser', 'addParser');
      log.warn(`Not adding existing parser ${stackedParser.refName} with override = ${override}, returning existing parser`);
      return inferenceParser;
    }
    if (override || inferenceParser === undefined) {
      const moduleResolver = new ModuleResolver();

     // let ruleElementReferenceOrPromise: RuleElementReference<InferenceParser> | Promise<RuleElementReference<InferenceParser>>;
      if (isRuleElementModuleReference(stackedParser)) {
        moduleResolver.add({
          refName: stackedParser.refName,
          loader: {
            module: stackedParser.module,
            loadPackageType: LoadPackageType.package
          },
          setter: {
            ownerIsObject: true,
            objectRef: this,
            setterFunction: 'resolveAddParser',
            paramsArray: [ec]
          }
        });
        //ruleElementReferenceOrPromise = this.loadRuleElementReference(stackedParser, check, paramsArray, ec);
      } else {
        this.parserMap.set(stackedParser.refName, {instanceRef: {instance:stackedParser, refName: stackedParser.refName}});
        if(!inferenceParser) {
          this.parserInferenceStack.push(stackedParser.refName);
        }
        return stackedParser;
        // ruleElementReferenceOrPromise = {instanceRef: {instance: stackedParser, refName: stackedParser.refName}};
      }
      if(moduleResolver.hasPendingResolutions()) {
        const resolutionsOrPromises = moduleResolver.resolve(ec);
        if (isPromise(resolutionsOrPromises)) {
          return resolutionsOrPromises
            .then(resolutions => {
              const someErrors = ModuleResolver.resolutionsHaveErrors(resolutions);
              if(someErrors) {
                log.warn(resolutions, 'Errors resolving modules');
                logErrorAndThrow(new EnhancedError('Errors resolving modules'), log, ec);
              } else {
                const addedParser = this.parserMap.get(stackedParser.refName)?.instanceRef?.instance;
                if(!addedParser) {
                  log.warn(resolutionsOrPromises, 'ModuleReference not added');
                  logErrorAndThrow(new EnhancedError('ModuleReference not added'), log, ec);
                } else {
                  return addedParser;
                }
              }
            });
        } else {
          const someErrors = ModuleResolver.resolutionsHaveErrors(resolutionsOrPromises);
          if(someErrors) {
            log.warn(resolutionsOrPromises, 'Errors resolving modules');
            logErrorAndThrow(new EnhancedError('Errors resolving modules'), log, ec);
          } else {
            const addedParser = this.parserMap.get(stackedParser.refName)?.instanceRef?.instance;
            if(!addedParser) {
              log.warn(resolutionsOrPromises, 'ModuleReference not added');
              logErrorAndThrow(new EnhancedError('ModuleReference not added'), log, ec);
            } else {
              return addedParser;
            }
          }
          const addedParser = this.parserMap.get(stackedParser.refName)?.instanceRef?.instance;
          if(!addedParser) {
            log.warn(resolutionsOrPromises, 'ModuleReference not added');
            logErrorAndThrow(new EnhancedError('ModuleReference not added'))
          }
          return this.parserMap.get(stackedParser.refName)?.instanceRef?.instance;
        }
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
  addParserAtStackIndex(stackedParser: InferenceParser | RuleElementModuleReference, stackIndex: number, ec?: ExecutionContextI): boolean | Promise<boolean> {
    const log = new LoggerAdapter(ec, 're-common', 'inference-stack-parser', 'addStackedParserAtStackIndex');
    if (this.hasParser(stackedParser.refName)) {
      // Rarely if'ed.  Create log here.
      log.warn(`Not adding existing parser ${stackedParser.refName}`);
      return false;
    } else if (isRuleElementModuleReference(stackedParser)) {
      const moduleResolver = new ModuleResolver();
      moduleResolver.add({
        refName: stackedParser.refName,
        loader: {
          module: stackedParser.module,
          loadPackageType: LoadPackageType.package
        },
        setter: {
          ownerIsObject: true,
          objectRef: this,
          setterFunction: 'resolveAddParserAtStackIndex',
          paramsArray: [stackIndex, ec],
        }
      });
      const resolutionsOrPromises = moduleResolver.resolve(ec);
      if(isPromise(resolutionsOrPromises)) {
        return resolutionsOrPromises
          .then(resolutions => {
            const someErrors = ModuleResolver.resolutionsHaveErrors(resolutions);
            if(someErrors) {
              log.warn(resolutionsOrPromises, 'Errors loading');
              logErrorAndThrow(new EnhancedError('Errors loading'), log, ec);
            } else {
              return true;
            }
          }, err => {
            throw logErrorAndReturn(err, log, ec);
          });
      } else {
        const someErrors = ModuleResolver.resolutionsHaveErrors(resolutionsOrPromises);
        if(someErrors) {
          log.warn(resolutionsOrPromises, 'Errors loading');
          logErrorAndThrow(new EnhancedError('Errors loading'), log, ec);
        } else {
          return true;
        }
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
  orderInferenceStack(inferenceStack: string[], ec?: ExecutionContextI) {
    // All the inference refs must be already loaded.
    if (inferenceStack.every(newInference => {
      if (!this.parserMap.has(newInference)) {
        const log = new LoggerAdapter(ec, 're-common', 'inference-stack-parser', 'setInferenceStack');
        log.warn(`inference ${newInference} was not previously loaded`);
        return false;
      } else return true;
    })) {
      this.parserInferenceStack = [];
      inferenceStack.forEach(newInference => {
        this.parserInferenceStack.push(newInference);
      });
    } else {
      const log = new LoggerAdapter(ec, 're-common', 'inference-stack-parser', 'setInferenceStack');
      log.warn({inferenceStack, existingStack: this.parserInferenceStack}, 'Mismatch in stack contents');
      const err = new Error(`Mismatch in stack contents`);
      logErrorAndThrow(err, log, ec);
    }
  }

  register(reference: InferenceParser | RuleElementModuleReference | RuleElementInstanceReference<InferenceParser>, override, ec?: ExecutionContextI): InferenceParser | Promise<InferenceParser> {
    if (!isRuleElementInstanceReference(reference)) {
      return this.addParser(reference, false, ec);
    } else {
      logErrorAndThrow(new Error('Not applicable'), undefined, ec);
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
      logErrorAndThrow(err, log, ec);
    }
  }
}
