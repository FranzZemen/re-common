
/**
 * Defines a function type that returns a Promise of any or any itself.
 *
 * @param dataDomain The arbitrary data passed to the implementation
 * @param scope Mapped scope information that may be of used to the implementation if it knows the contract
 * @param ec The optional execution context
 * @param params Arbitrary parameters array that may be needed by contract
 *
 * @return If the implementation is asynchronous as Promise<any> should be returned, otherwise just the return value
 */
export type AwaitEvaluation = (dataDomain: any, scope: Map<string, any>, ec?: LogExecutionContext, ...params) => Promise<any> | any;
