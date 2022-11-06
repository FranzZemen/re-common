/*
Created by Franz Zemen 11/05/2022
License Type: MIT
*/
import {appSchemaWrapper} from '@franzzemen/app-execution-context';
import {executionSchemaWrapper} from '@franzzemen/execution-context';
import {LogExecutionContext, logSchemaWrapper} from '@franzzemen/logger-adapter';
import Validator, {ValidationError} from 'fastest-validator';
import {isPromise} from 'util/types';

export interface CommonOptions {
  name?: string,
  throwOnAsync?: boolean;
}

export interface Common {
  common?: CommonOptions
}

export interface CommonExecutionContext extends LogExecutionContext {
  re?: Common
}

export class CommonExecutionContextDefaults {
  static ThrowOnAsync = false;
  static ReCommonOptions = {
    throwOnAsync: CommonExecutionContextDefaults.ThrowOnAsync
  }

  static ReOptions = {
    common: CommonExecutionContextDefaults.ReCommonOptions
  }
  static ReCommonExecutionContext = {
    re: CommonExecutionContextDefaults.ReOptions
  }
}

export const commonOptionsSchema = {
  name: {type: 'string', optional: true},
  throwOnAsync: {type: 'boolean', optional: true, default: CommonExecutionContextDefaults.ThrowOnAsync}
}

export const commonOptionsSchemaWrapper = {
  type: 'object',
  optional: true,
  default: CommonExecutionContextDefaults.ReCommonOptions,
  props: commonOptionsSchema
}

const commonSchema = {
  common: commonOptionsSchemaWrapper
}

export const commonSchemaWrapper = {
  type: 'object',
  optional: true,
  default: CommonExecutionContextDefaults.ReOptions,
  props: commonSchema
}


export const commonExecutionContextSchema = {
  execution: executionSchemaWrapper,
  app: appSchemaWrapper,
  log: logSchemaWrapper,
  re: commonSchemaWrapper
}

export const commonExecutionContextSchemaWrapper = {
  type: 'object',
  optional: true,
  default: CommonExecutionContextDefaults.ReCommonExecutionContext,
  props: commonExecutionContextSchema
}


export function isCommonExecutionContext(options: any | CommonExecutionContext): options is CommonExecutionContext {
  return options && 're' in options; // Faster than validate
}

const check = (new Validator({useNewCustomCheckerFunction: true})).compile(commonExecutionContextSchema);

export function validate(context: CommonExecutionContext): true | ValidationError[] {
  const result = check(context);
  if (isPromise(result)) {
    throw new Error('Unexpected asynchronous on CommonExecutionContext validation');
  } else {
    if (result === true) {
      context.validated = true;
    }
    return result;
  }
}
