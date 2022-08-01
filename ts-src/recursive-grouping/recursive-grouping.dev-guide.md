# Recursive Grouping Developer Guide
A recursive grouping is one where reference objects, or fragments are connected to each other by operators,
with nesting possible to any depth.

For example a rule can be a recursive grouping:

    5.0 > stock.price and 25 < stock.PE or (10 < stock.PE)

Another example might be a formula

    @fx(average(sector.prices) * (sector.volatility - 4.5))

Parsing recursive groupings presents some special logic challenges:

- There are operators, which may apply to groupings or fragments
- There is an implicit operator for the first fragment in a grouping, indeed sometimes for the first grouping
when nesting groupings immediately in each other for example ((a+b)-c).
- At any point we may be dealing next with a fragment or a grouping

## Conventions

1. There is an ordering to the operators called operator precedence which can only be broken with grouping.  
   Arithmetically that is "*, /, +, -".  Logically that is a "and, and not, or, or not".  Note that in the logical 
   series we take care of the unary not by considering it paired with either "and, or".  This makes processing much 
   easier.
2. There is always a default outer Grouping, even if the text format does not show it.
3. The grouping symbols are the curvy brackets ( ), although we could easily change things to that being provided.
4. There is an "end of grouping" which is one of:
   1. A closing bracket at the same level as the opening bracket which signals that the group is closed
   2. End of input, in which case all open grouping close, rolling back up the recursion
   3. An end of grouping condition, expressed as array of regular expression tests that would signal it
5. We do not look ahead ot the end of grouping - when we encounter it, that is when it is processed.
6. Fragments know how to parse themselves
7. It's possible that within one type of grouping (logical) we encounter another type of grouping (formulaic).

