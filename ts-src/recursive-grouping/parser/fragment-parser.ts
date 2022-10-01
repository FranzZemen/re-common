import {ExecutionContextI} from '@franzzemen/app-utility';
import {ParserMessages} from '../../parser-messages/parser-messages.js';

export abstract class FragmentParser<Reference> {
  abstract parse(fragment: string, scope: Map<string, any>, ec?: ExecutionContextI) : [string, Reference, ParserMessages];
}
