import {ExecutionContextI, ModuleResolver} from '@franzzemen/app-utility';

export abstract class FragmentParser<Reference> {
  abstract parse(moduleResolver: ModuleResolver, fragment: string, scope: Map<string, any>, ec?: ExecutionContextI) : [string, Reference];
}
