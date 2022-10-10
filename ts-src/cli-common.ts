import {
  ExecutionContextI,
  isAppConfigSync,
  loadJSONResource,
  LoggerAdapter,
  ModuleResolution
} from '@franzzemen/app-utility';
import {isPromise} from 'node:util/types';
import {RuleElementFactory} from './rule-element-ref/rule-element-factory.js';

export type CliFunction = (args: string[], ec?: ExecutionContextI) => void;

export function execute(key: string, cliFunction: CliFunction, defaultEC?: ExecutionContextI) {
  const log = new LoggerAdapter(defaultEC, 're-common', 'cli-common', 'execute');
  log.debug(process.argv, 'argv');
  if(process.argv[2] !== key) {
    log.error(`Parameters must start with keyword ${key}`);
    process.exit(3);
  }
  let args = process.argv.slice(3);
  log.debug(args, 'args');
  let ec: ExecutionContextI;
  try {
    const configContainer = loadJSONResource({moduleName: '../../../cli.json', moduleResolution: ModuleResolution.json}, defaultEC);
    if(isPromise(configContainer)) {
      log.error('Unsupported dynamic JSON load or schema validation');
      process.exit(2);
    } else if(isAppConfigSync(configContainer) && configContainer?.log) {
      ec = {config: configContainer};
    } else {
      ec = defaultEC;
    }
  } catch (err) {
    ec = defaultEC;
  }
  cliFunction(args, ec);
}

export class CliFactory extends RuleElementFactory<CliFunction> {
  constructor() {
    super();
  }

  protected isC(obj: any): obj is CliFunction {
    if(typeof obj === 'function') {
      return true;
    }
  }
}

export const defaultCliFactory = new CliFactory();
