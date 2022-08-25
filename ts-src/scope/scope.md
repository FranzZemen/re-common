# Scope

This section is most relevant to re framework contributors:

The re framework allows for various definitions to be performed at different hierarchical levels, that can be overriden
in other levels. This necessitates a concept the framework terms _scope_, which is similar to saying "in what scope are
we wanting to find this definition".

One of the most frequent uses of scope will be with respect to module references, for example to define a custom data
type. It may be the desire to limit custom data types to certain areas; thus they would only be loaded into the scope
for those areas. Another reason might be to override a known parser, without changing the code itself.

For reasons like these the re framework is soft coded to retrieve such definitions from a scope object, making such
definitions highly flexible. If no special definition overrides are provided, the code works as is.

The Scope object is the base class to track scope. It provides some convenience methods, but most importantly it
inherits from the Map<string, any> template definition; allowing scope information to be kept as key-value pairs.

## Scope Hierarchy

Scopes are also hiearchical, in two ways:

1. Class Hiearchy
2. Parent/Children Hierarchy

### Class Hierarchy

The Scope definition follows a hierarchy of extended classes from Scope to the topmost class, which is loosely tied to
the re framework hiearchy of RulesEngine->Application->RuleSet->Rule->Logical Condition->Condition->Expression->
DataType. This allows for constants and convenience methods to be defined at the most appropriate level, but is the
least interesting part of scope hierarchy. Essentially, the code can refer to scopes through the definition at each
level down, with the most convenient one being Map.

### Parent/Children Hierarchy
The more interesting scope hierarchy is the concept of parent scope and child scopes, which can exist in any given
   scope:

        let scope: Scope = ...
        const parentScope: Scope = scope.get(Scope.ParentScope);
        const childScopes: Scope[] = scope.get(Scope.ChildScopes);

This is what allows each rule construct _instance_ to have its own scope, and what allows definitions to be 
localized.  It can map roughly to the re framework hierarchy since by default all definitions are created at the 
topmost scope, but it allows for nested children to define their own definitions and ovveride parent definitions.  
Moreover, some rule constructs usages are not hiearchical, but still follow the rules of containerization and thus 
parent/children concepts.

## Scope Initialization
Scope initialization can be default, or optioned (driven by an options object).

## Scope Manipulation
TBD
