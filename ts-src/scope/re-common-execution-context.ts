/*
Created by Franz Zemen 11/05/2022
License Type: MIT
*/
import {appSchemaWrapper} from '@franzzemen/app-execution-context';
import {executionSchemaWrapper} from '@franzzemen/execution-context';
import {LogExecutionContext, logSchemaWrapper} from '@franzzemen/logger-adapter';
import Validator, {ValidationError} from 'fastest-validator';
import {isPromise} from 'util/types';

export interface ReCommonOptions {
  name?: string,
  throwOnAsync?: boolean;
}

export interface ReOptions {
  common?: ReCommonOptions
}

export interface ReCommonExecutionContext extends LogExecutionContext {
  re?: ReOptions
}

export class ReCommonExecutionContextDefaults {
  static ThrowOnAsync = false;
  static ReCommonOptions = {
    throwOnAsync: ReCommonExecutionContextDefaults.ThrowOnAsync
  }

  static ReOptions = {
    common: ReCommonExecutionContextDefaults.ReCommonOptions
  }
  static ReCommonExecutionContext = {
    re: ReCommonExecutionContextDefaults.ReOptions
  }
}

export const commonOptionsSchema = {
  name: {type: 'string', optional: true},
  throwOnAsync: {type: 'boolean', optional: true, default: ReCommonExecutionContextDefaults.ThrowOnAsync}
}

export const commonOptionsSchemaWrapper = {
  type: 'object',
  optional: true,
  default: ReCommonExecutionContextDefaults.ReCommonOptions,
  props: commonOptionsSchema
}

const reOptionsSchema = {
  common: commonOptionsSchemaWrapper
}

export const reOptionsSchemaWrapper = {
  type: 'object',
  optional: true,
  default: ReCommonExecutionContextDefaults.ReOptions,
  props: reOptionsSchema
}


export const reCommonExecutionContextSchema = {
  execution: executionSchemaWrapper,
  app: appSchemaWrapper,
  log: logSchemaWrapper,
  re: reOptionsSchemaWrapper
}

export const reCommonExecutionContextSchemaWrapper = {
  type: 'object',
  optional: true,
  default: ReCommonExecutionContextDefaults.ReCommonExecutionContext,
  props: reCommonExecutionContextSchema
}


export function isCommonExecutionContext(options: any | ReCommonExecutionContext): options is ReCommonExecutionContext {
  return options && 're' in options; // Faster than validate
}

const check = (new Validator({useNewCustomCheckerFunction: true})).compile(reCommonExecutionContextSchema);

export function validate(context: ReCommonExecutionContext): true | ValidationError[] {
  const result = check(context);
  if (isPromise(result)) {
    throw new Error('Unexpected asynchronous on ReCommonExecutionContext validation');
  } else {
    if (result === true) {
      context.validated = true;
    }
    return result;
  }
}
