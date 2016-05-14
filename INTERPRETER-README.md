#INTERPRETER-README
This module gives logical interpretations from the parsing results.

First `cmd.command` is read to find which command the robot arm is supposed to do.

Then the `cmd` is parsed to find out which entity objects and location objects
the parse tree is talking about. It also checks if any of them has a relative clause.

When this is done the it matches the object definitions for these objects with the current world. After this it makes sure that all of the interpretations follows the spatial rules
and the physical laws of the world.

It does not handle quantifiers and do not support more than one relative clauses in an
object location e.g. "Take the ball beside a box beside a table" is not currently supported.
