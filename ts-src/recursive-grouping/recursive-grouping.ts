export interface Fragment<OperatorType, Reference> {
  /*
 * A Fragment is something that contains a reference object, as well an operator to that object, which may be a default
 * operator if not provided in text format.
 *
 * Examples:  Conditions, Formula Expressions
 */
  operator: OperatorType;
  reference: Reference
}

export type FragmentOrGrouping<OperatorType, Reference> = Fragment<OperatorType, Reference>| RecursiveGrouping<OperatorType, Reference>;

export function isFragment(fragment: FragmentOrGrouping<any, any>): fragment is Fragment<any, any> {
  return 'reference' in fragment;
}

export function isRecursiveGrouping(grouping: FragmentOrGrouping<any, any>): grouping is RecursiveGrouping<any, any> {
  return 'group' in grouping;
}

export function isRecursiveGroupingOrAny(grouping: any | RecursiveGrouping<any, any>): grouping is RecursiveGrouping<any, any> {
  return 'group' in grouping;
}

export interface RecursiveGrouping<OperatorType, Reference> {
  /*`
   * A Grouping is an array of Fragments and or Groupings.  A Grouping has an operator to it, which may be a default
   * operator if not provided in text format
   *
   * Examples: Logical Conditions, Formulas
   */
  operator: OperatorType;
  group: FragmentOrGrouping<OperatorType, Reference>[];
}

