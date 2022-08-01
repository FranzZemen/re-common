# Recursive Groupings
Several rule constructs are recursive in nature, due to nesting.  For example currently this includes:

- Logical Conditions can be nested to allow for any logical combination as opposed to just default logical precedence
- Logical Expressions, which are closely similar to Logical Conditions, for the same reasons
- Formula Expressions, which allow nesting to overcome default operator precedence

To support recursive groupings and all the similar logic that might be needed, the Reference Format for all 
recursive groupings is similar, and the parsing of the Text Format likewise. 

The idea behind recursive groupings is that a recursive group is a set of things separated by sets of operators (which 
can be anything desired), and that these things can be nested in "(", ")" brackets, which at run time are evaluated 
first.  There is no limit to the depth of the nesting.

For example, say we have the things A, B, C and D and logical operators and, and not, or, or not.  We might express 
a recursive grouping as ...

    A and (B or C)

... if we wanted to evaluate "B or C" prior to "A and B", since intersection operations (and) preceeds union 
operations (or) in logical operator precedence rules.

Similarly, in a formula multiplication preceeds addition, so brackets are necessary to force addition first:

    A * (B + C)


## Reference Format

Given the constructs

    A and (B or C)

we note that we have "things" A, B, C separated by operators and enclosed in brackets.  Actually better than 
separated by operators A, B and C are preceded by operators.  In fact A is preceeded by the default, implicit
"and", as is B.  The "and" operator between A and (B and C) actually is an operator for the bracketed part (...).

With this in mind, we could think of the above as

    A and D

Where D is

    B or C

We follow this logic to make something clear:  A thing can be an elementary thing like A, B, C or a group of things 
like "B or C".  The brackets just help us visually see the groups.

We define a Fragment as an elementary thing that has an operator.

    interface Fragment {
        operator: string;
        reference: any;
    }

But given that this shape will work for "any" type of thing, and we're likely to want the same shape for many types 
of things, we can use generics

    interface Fragment<OperatorType,Reference> {
    { 
        operator: OperatorType;
        reference: Reference;
    }

Now we need something to represent a group, which contains elementary things and has an operator


    interface RecursiveGrouping<OperatorType, Reference> {
        operator: OperatorType;
        group: Fragment<OperatorType, Reference>[];
    }

But wait, this will only do one level of nesting, since everything in a group is a Fragment.  But for any level of 
nesting, a group may also contain a group.  

Let's define 

    type FragmentOrGrouping<OperatorType, Reference> = Fragment<OperatorType, Reference>| RecursiveGrouping<OperatorType, Reference>;

to have a type that is either a Fragment or a Recursive Grouping.

Now we "fix" the Recursive Grouping shape:

    interface RecursiveGrouping<OperatorType, Reference> {
        operator: OperatorType;
        group: FragmentOrGrouping<OperatorType, Reference>[];
    }

So at each level there is an array of things, each of those things can be an elementary Fragment or a nesting.

By convention, we consider the top level a group. Thus:

    A and B

Form a top level group, as we need to put them in something.

So the reference format is

    interface Fragment<OperatorType,Reference> {
    { 
        operator: OperatorType;
        reference: Reference;
    }

    type FragmentOrGrouping<OperatorType, Reference> = Fragment<OperatorType, Reference>| RecursiveGrouping<OperatorType, Reference>;

    interface RecursiveGrouping<OperatorType, Reference> {
        operator: OperatorType;
        group: FragmentOrGrouping<OperatorType, Reference>[];
    }

For Logical Conditions, the reference format is therefore:

    interface Fragment {
    { 
        operator: LogicalOperator;
        reference: ConditionReference;
    }

    interface RecursiveGrouping {
        operator: LogicalOperator;
        group: (Fragment | RecursiveGrouping) [];
    }

For Logical Expressions, the reference format is therefore:

    interface Fragment {
    { 
        operator: LogicalOperator;
        reference: Expression;
    }

    interface RecursiveGrouping {
        operator: LogicalOperator;
        group: (Fragment | RecursiveGrouping) [];
    }

For Formula Expressions, the reference format is therefore:

    interface Fragment {
    { 
        operator: FunctionOperator;
        reference: Expression;
    }

    interface RecursiveGrouping {
        operator: FunctionOperator;
        group: (Fragment | RecursiveGrouping) [];
    }

For a Logical Condition or a Logical Expressions, the operators are "and", "and not", "or", "or not".

For Logical Conditions the Reference Generic is Condition.  

For Logical Expressions the Reference Generic is any Expression that has a Data Type of Boolean.

For a Formula Expression the operators are "+", "-", "or", "not" and the Reference Generic is any Expression.  There 
are of course other rules for Formula Expressions covered in that documentation.  

## Text Format

The Reference Format may appear simple, but by the time the group property gets fully populated, its a bit of a 
complex looking structure.  It is far easier to manipulate it in the Text Format, because it looks so much like what 
we learned in school.

Consider the Logical Condition:

    stock.price > 5.0 and (stock.PERatio > 10 or @stockStochastic > 0.9)

Or the equivalent Logical Expression

    ?:[?[stock.price > 5.0 and (stock.PERatio > 10] or ?[@stockStochastic > 0.9])]

Or a similar logical condition:

    ?:[@thresholdPrice and (@thresholdPERatio or @SellSignal)]

Or a Formula

    @+[stock.price * (@factor1 + 5.0)]

