# Rule Element References

A Rule Element Reference is the Rules Engine way of referring to externalized functionality; it is a descriptor on how
to get to that functionality.

There are two types of Rule Element References, namely the true descriptor RuleElementModuleReference, and the instance
version called RuleElementInstanceReference. In either case, only access to the external functionality is described, not
the contract the external functionality needs to implement.

## Rule Element Module Reference

The Rule Element Module Reference is a descriptor to external functionality. It includes a unique name provided so that
it might be referred to elsewhere by that name, as well as a Module descriptor:

    interface RuleElementModuleReference {
        refName: string;
        module: Module;
    }

A Module descriptor indicates where to find the external functionality, and whether to invoke it as a function or a
constructor:

    type Module = {
        moduleName: string, 
        functionName?: string, 
        constructorName?: string
    }

It contains both a functionName and a constructorName field. Only one of these should be populated. Note that the
moduleName may be relative or a named package. If relative, it is relative to the location of the
@franzzemen/app-utility/load-from-module module in the root of app-utility, so normally one would have to prefix to get
to the relative package, for example '../../../some-module-path' to exit node_modules/@franzzemen/app-utility.

## The Rule Element Module Reference Function or Constructor

The purpose of the Rule Element Module Reference is to provide a factor a way of creating a customization of interest.

If a function name is provided, the only contract expected here is that the function act as a factory function and
return an instance of the customization of interest. The function may take any number of parameters as specified by the
customization contract.

Similarly, if a constructor is provided, the contract expected here is that invoking it with the "new" operator results
in an instance of the customization of interest. The constructor may take any number of parameters as specified by the
customization contract.

## Rule Element Instance Reference

The Rule Element Instance Reference is the result of loading the instance using the Rule Element Module Reference's
function or constructor. The Rules Engine user should not need to worry about this object unless they are contributing
or performing advanced programmatic work.

    interface RuleElementInstanceReference<C> {
        refName: string;
        instance: C;
    }

## Rule Element Reference

The Rule Element Reference is a union of the Rule Element Module Reference and Rule Element Instance Reference and used
by the Rule Element Factory. Usually only one part of the union is specified.

## Rule Element Factory

The Rule Element Factory loads the customization of interest as defined by the Rule Element Reference using  
@franzzemen/app-utility/load-from-module. The instance of the customization is stored in the repo, and optionally
replaced using an override flag.

