import {LogExecutionContext} from '@franzzemen/logger-adapter';
import {ParserMessages} from '../../parser-messages/parser-messages.js';

export abstract class FragmentParser<Reference> {
  abstract parse(fragment: string, scope: Map<string, any>, ec?: LogExecutionContext) : [string, Reference, ParserMessages];
}
