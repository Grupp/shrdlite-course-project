#ASTAR-README
Quite standard implementation of A*, our choices were:

The algorithm uses linear backtracking.
The algorithm uses a heap for sorting of the frontier nodes.

One thing to point out is that the comparator in the heap checks if the value of the f score is undefined.If it is it defaults to infinity. This is because undefined is treated as zero which would brake the ordering of the heap.

Otherwise the code is self explanatory.
