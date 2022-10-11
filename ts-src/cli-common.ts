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

export type CliFunction<T> = (t: T, ec?: ExecutionContextI) => void;

const defaultEC: ExecutionContextI = {
  config: {
    log: {
      level: LoggerAdapter.lvl_info
    }
  }
};

export class CliImplementation {
  constructor(public commandLineKey: string, public cliFunction: CliFunction<any>) {
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

export interface CliIteration<T> {
  description?: string;
  t: T
}


export interface CliFormat<T> {
  iterations: CliIteration<T>[];
}

export function isCliFormat(cliFormat: Promise<CliFormat<any>> | CliFormat<any> | any): cliFormat is CliFormat<any> {
  return 'iterations' in cliFormat;
}

export function execute<T>() {
  let ec: ExecutionContextI;
  try {
    const configContainer = loadJSONResource({
      moduleName: '../../../cli.json',
      moduleResolution: ModuleResolution.json
    }, defaultEC);
    if (isPromise(configContainer)) {
      const log = new LoggerAdapter(defaultEC, 're-common', 'cli-common', 'execute');
      log.error('Unsupported dynamic JSON load or schema validation');
      process.exit(2);
    } else if (isAppConfigSync(configContainer) && configContainer?.log) {
      ec = {config: configContainer};
    } else {
      ec = defaultEC;
    }
  } catch (err) {
    ec = defaultEC;
  }
  const log = new LoggerAdapter(ec, 're-common', 'cli-common', 'execute');

  log.debug(process.argv, 'argv');
  if (process.argv.length < 4) {
    log.error(`Parameters are: keyword -file[filename]`);
    process.exit(3);
  }
  const keyword = process.argv[2];
  log.debug(`keyword ${keyword} found`);
  const cliImpl: CliImplementation = defaultCliFactory.getRegistered(keyword, ec);
  if (!cliImpl) {
    log.error(`keyword not in CliFactory`);
    process.exit(4);
  }
  const regex = /^-file\[([a-zA-Z0-9.\/\\\-_]*)]$/;
  let result = regex.exec(process.argv[3]);
  if (result !== null) {
    let filename = result[1];
    try {
      /* Now going with JSON
      let file = readFileSync(filename, 'utf8');
      file = file.trim();
       */
      const cliData = loadJSONResource<CliFormat<T>>({
        moduleName: filename,
        moduleResolution: ModuleResolution.json
      }, ec);
      // For now, reject promises caused by async validations...also not using es module loads
      if (isPromise(cliData)) {
        log.error('Not using promises for this functionality');
        process.exit(9);
      } else {
        cliIterations<T>(cliData, cliImpl.cliFunction, ec);
      }
    } catch (err) {
      log.error(err);
      process.exit(5);
    }
  } else {
    log.error(`Parameters are: keyword -file[filename], -file[filename] is missing`);
    process.exit(7);
  }

}

export const breakLine = '-----';

export function cliIterations<T>(cliData: CliFormat<T>, cliFunction: CliFunction<T>, ec?: ExecutionContextI) {
  const log = new LoggerAdapter(ec, 're-common', 'cli-common', 'cliIterations');
  log.info('Input Data:');
  log.info(cliData);
  log.info('Iterating');
  log.info(breakLine);
  cliData.iterations.forEach((iteration, ndx) => {
    if(ndx > 0) {
      log.info('-----')
    }
    if(iteration.description) {
      log.info(`Description: ${iteration.description}`)
    }
    cliFunction(iteration.t, ec);
  })

  /*
  Now going with obj, not text from file

  log.info(`text to parse:`);
  text = text.replaceAll('\r\n', '\r\n   ');
  log.info(text);
  log.info('-----');
  let tokens = text.split('-----');
  for (let i = 0; i < tokens.length; i++) {
    if (i > 0) {
      log.info('-----');
    }
    let iteration = tokens[i].trim();
    log.info(`Iteration: ${iteration}`);
    log.info('-');
    cliFunction(iteration, ec);
  }
   */

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
