import {
  ExecutionContextI,
  Hints,
  isConstrainedModuleDefinition,
  LoggerAdapter,
  ModuleDefinition
} from '@franzzemen/app-utility';
import {HintKey} from './hint-key';

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
  ec?: ExecutionContextI,
  moduleKey = HintKey.Module,
  moduleNameKey = HintKey.ModuleName,
  moduleFunctionNameKey = HintKey.FunctionName,
  moduleConstructorNameKey = HintKey.ConstructorName): ModuleDefinition {

  const log = new LoggerAdapter(ec, 'rules-engine', 'load-module-definition-from-hints', 'loadModuleDefinitionFromHints');
  let module: ModuleDefinition;
  const moduleName = hints.get(moduleNameKey) as string;
  if (moduleName) {
    // Case a or b
    const functionName = hints.get(moduleFunctionNameKey) as string;
    const constructorName = hints.get(moduleConstructorNameKey) as string;
    if (functionName && constructorName) {
      const err = new Error(`Both function name ${functionName} and constructor name ${constructorName} provided, only one should be`);
      log.error(err);
      throw err;
    }
    module = {moduleName, functionName, constructorName};
  } else {
    const obj = hints.get(moduleKey);
    if(typeof obj === 'object') {
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
          log.error(err);
          throw err;
        }
      }
    }
  }
  return module;
}
