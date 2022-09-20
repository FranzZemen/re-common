export class HintKey {
  static Prefix = 'prefix';
  static Name = 'name';
  static Options = 'options';
  static Module = 'module';
  static ModuleName = 'module-name';
  static FunctionName = 'function-name';
  static ConstructorName = 'constructor-name';
  static ModuleResolutionName = 'module-resolution';
  static LoadSchema = 'load-schema';
  // This is a unary hint.  Presence means true
  static Override = 'override'
  // This is a unary hint.  Presence means true
  static OverrideDown = 'override-down'
}
