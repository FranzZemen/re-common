import {logErrorAndReturn} from '@franzzemen/enhanced-error';
import {Hints} from '@franzzemen/hints';
import {LogExecutionContext, LoggerAdapter} from '@franzzemen/logger-adapter';
import {
  isConstrainedModuleDefinition,
  LoadSchema,
  ModuleDefinition
} from '@franzzemen/module-factory';
import {HintKey} from './hint-key.js';

/**
 * Check to see if the module definition is provided.  There are four ways this might be defined:
 *
 * a) Separate hint fields specifying factory function (we are using the explicit "type" hint here as well for
 * readability, and a relative path to a module)
 *
 * <<ex
 *         type=Function
 *         module-name=../../../custom/expression/stock-stochastic,
 *         function-name=stockStochasticFactory,
 *     >> StockStochastic
 *
 * b) Separate hint fields specifying constructor (we are using a package path here:
 *
 *     <<ex
 *         module-name=@franzzemen/custom-expressions,
 *         constructor-name=StockStochastic,
 *     >> @StockStochastic
 *
 * c) JSON hint with factory function
 *
 *      <<ex module={
 *             "moduleName": "../../../custom/expression/stock-stochastic",
 *             "functionName": "stockStochasticFactory"
 *           }
 *     >> @StockStochastic
 *
 * d) JSON hint with constructor
 *
 *      <<ex module={
 *             "moduleName": "../../../custom/expression/stock-stochastic",
 *             "constructorName": "StockStochastic"
 *           }
 *     >> @StockStochastic
 *
 */
export function loadModuleDefinitionFromHints(
  hints: Hints,
  ec?: LogExecutionContext,
  moduleKey = HintKey.Module,
  moduleNameKey = HintKey.ModuleName,
  moduleFunctionNameKey = HintKey.FunctionName,
  moduleConstructorNameKey = HintKey.ConstructorName,
  moduleResolutionKey = HintKey.ModuleResolution,
  loadSchemaKey = HintKey.LoadSchema): ModuleDefinition {

  const log = new LoggerAdapter(ec, 'rules-engine', 'load-module-definition-from-hints', 'loadModuleDefinitionFromHints');
  let module = hints.get(moduleKey) as ModuleDefinition;
  // Preferentially load the module if available
  if (module) {
    const obj = hints.get(moduleKey);
    if (typeof obj === 'object') {
      module = obj as ModuleDefinition;
    } else {
      const json = hints.get(moduleKey) as string;
      if (json) {
        // Case c or d
        try {
          const moduleCandidate = JSON.parse(json);
          if (isConstrainedModuleDefinition(moduleCandidate)) {
            module = moduleCandidate;
          }
        } catch (err) {
          log.warn(json, `Expected JSON for ${HintKey.Module} hint`);
          throw logErrorAndReturn(err as unknown as Error, log);
        }
      }
    }
  } else {
    const moduleName = hints.get(moduleNameKey) as string;
    if (moduleName) {
      // Case a or b
      const functionName = hints.get(moduleFunctionNameKey) as string;
      const constructorName = hints.get(moduleConstructorNameKey) as string;
      if (functionName && constructorName) {
        const err = new Error(`Both function name ${functionName} and constructor name ${constructorName} provided, only one should be`);
        throw logErrorAndReturn(err, log);
      }
      const loadSchema = hints.get(loadSchemaKey) as LoadSchema;
      module = {moduleName, functionName, constructorName, loadSchema};
      // Put back in hints in order to have it there as the preferred view
      hints.set(moduleKey, module);
    }
  }
  return module;
}
