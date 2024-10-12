# Inference Stack Parser
This section is most relevant to advanced contributors.

The Inference Stack Parser provides base class behaviors for inference parsing.  Inference parsing is when a parser 
encounters a construct for which there is no obvious kind or hint and attempts to infer what it is based on 
constructs already registered.  It does so by calling, in succession, a stack of registered parsers.

This Inference Stack Parser makes few demands on the shape of the actual parsers to be registered by implementations.  
They only need to contain a unique "refName" string property.  The parsers that are registered can be module loaded.  
As such the ModuleDefinition.LoadSchema or a CheckFunction can be used to validate the shape of the module loaded parser 
upon load.  This can be done either by the implementation class (through an override of addParser... methods), or by a 
user of the implementation class (no overrides).  The former is recommended.

## Asynchronous Behavior
Certain operations have asynchronous behaviors.  This will happen if a module reference is provided when adding a 
parser to the Stack and that module is an ES module.  If Commonjs modules are used in the module reference, the 
behavior will remain synchronous.

