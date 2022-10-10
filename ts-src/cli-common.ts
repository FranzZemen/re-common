import {
  ExecutionContextI,
  isAppConfigSync,
  loadJSONResource,
  LoggerAdapter,
  ModuleResolution
} from '@franzzemen/app-utility';
import {isPromise} from 'node:util/types';
import {ParserMessages, ParserMessageType} from './parser-messages/parser-messages.js';
import {RuleElementFactory} from './rule-element-ref/rule-element-factory.js';

export type CliFunction = (args: string[], ec?: ExecutionContextI) => void;

const defaultEC: ExecutionContextI = {
  config: {
    log: {
      level: LoggerAdapter.lvl_info
    }
  }
};

export class CliImplementation {
  constructor(public commandLineKey: string, public cliFunction: CliFunction) {
  }
}

// TODO:  This makes CliImplementation loadable
export class CliFactory extends RuleElementFactory<CliImplementation> {
  constructor() {
    super();
  }

  protected isC(obj: any): obj is CliImplementation {
    return obj instanceof CliImplementation;
  }
}

export const defaultCliFactory = new CliFactory();


export function execute() {
  let ec: ExecutionContextI;
  try {
    const configContainer = loadJSONResource({moduleName: '../../../cli.json', moduleResolution: ModuleResolution.json}, defaultEC);
    if(isPromise(configContainer)) {
      const log = new LoggerAdapter(defaultEC, 're-common', 'cli-common', 'execute');
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
  const log = new LoggerAdapter(ec, 're-common', 'cli-common', 'execute');

  log.debug(process.argv, 'argv');
  if(process.argv.length < 3) {
    log.error(`Parameters must start with keyword`);
    process.exit(3);
  }
  const keyword = process.argv[2];
  log.debug(`keyword ${keyword} found`);
  const cliImpl: CliImplementation = defaultCliFactory.getRegistered(keyword, ec);
  if(!cliImpl) {
    log.error(`keyword not in CliFactory`);
    process.exit(4);
  }
  let args = process.argv.slice(3);
  log.debug(args, 'args');
  cliImpl.cliFunction(args, ec);
}

export function logParserMessages(parserMessages: ParserMessages, ec?: ExecutionContextI) {
  if (parserMessages) {
    const log = new LoggerAdapter(ec, 're-common', 'cli-common', 'logParserMessages');
    let params: [data?: any, message?: string] = [];
    parserMessages.forEach(parserMessage => {
      params = [];
      if (parserMessage.contextObject) {
        params.push(parserMessage.contextObject);
      }
      params.push(parserMessage.message);
      if (parserMessage.type === ParserMessageType.Info) {
        log.info(...params);
      } else if (parserMessage.type === ParserMessageType.Note) {
        log.debug(...params);
      } else if (parserMessage.type === ParserMessageType.Trivial) {
        log.trace(...params);
      } else if (parserMessage.type === ParserMessageType.Warn) {
        log.warn(...params);
      } else if (parserMessage.type === ParserMessageType.Error) {
        log.error(parserMessage.message);
      }
    });
  }
}
