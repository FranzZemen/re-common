import {ExecutionContextI} from '@franzzemen/app-utility';

export abstract class FragmentParser<Reference> {
  abstract parse(fragment: string, scope: Map<string, any>, ec?: ExecutionContextI) : [string, Reference | Promise<Reference>];
}
