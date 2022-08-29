# Inference Stack Parser
This section is most relevant to advanced contributors.

The Inference Stack Parser provides base class behaviors for inference parsing.  Inference parsing is when a parser 
encounters a construct for which there is no obvious kind or hint and attempts to infer what it is based on 
constructs already registered.

The base class does not actually parse anything, just provides convenience methods to manage the inference stack.
