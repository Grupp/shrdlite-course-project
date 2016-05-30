#PLANNER-README

Planner
The planner devides the problem into sub-plans, and solves each one individually
by finding their specific goal state.

Heuristics
The heuristsics is calulated based on the the amount
of moves that the robot atleast has to make.
This is calulated based on how many items are
on top of the selected items, and/or destination.
This amount is multiplied by four since
it takes at least that many moves by the
robot to moveone item away from a pile,
and then move back to it.
