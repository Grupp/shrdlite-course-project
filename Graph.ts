///<reference path="lib/collections.ts"/>
///<reference path="lib/node.d.ts"/>

/** Graph module
*
*  Types for generic A\* implementation.
*
*  *NB.* The only part of this module
*  that you should change is the `aStarSearch` function. Everything
*  else should be used as-is.
*/

/** An edge in a graph. */
class Edge<Node> {
    from : Node;
    to   : Node;
    cost : number;
}

/** A directed graph. */
interface Graph<Node> {
    /** Computes the edges that leave from a node. */
    outgoingEdges(node : Node) : Edge<Node>[];
    /** A function that compares nodes. */
    compareNodes : collections.ICompareFunction<Node>;
}

/** Type that reports the result of a search. */
class SearchResult<Node> {
    /** The path (sequence of Nodes) found by the search algorithm. */
    path : Node[];
    /** The total cost of the path. */
    cost : number;
}


/**
* A\* search implementation, parameterised by a `Node` type.
*
* @param graph The graph on which to perform A\* search.
* @param start The initial node.
* @param goal A function that returns true when given a goal node. Used to determine if the algorithm has reached the goal.
* @param heuristics The heuristic function. Used to estimate the cost of reaching the goal from a given Node.
* @param timeout Maximum time (in seconds) to spend performing A\* search.
* @returns A search result, which contains the path from `start` to a node satisfying `goal` and the cost of this path.
*/
function aStarSearch<Node> (
    graph : Graph<Node>,
    start : Node,
    goal : (n:Node) => boolean,
    heuristics : (n:Node) => number,
    timeout : number
) : SearchResult<Node> {
    var result : SearchResult<Node> = {
        path: [],
        cost: Infinity
    };

    // start timer
    let startTime :number = Date.now();

    // store cost, f-value and path in dictionaries
    let costDict :collections.Dictionary<Node, number> = new collections.Dictionary<Node, number>();
    let fValDict :collections.Dictionary<Node, number> = new collections.Dictionary<Node, number>();
    let parentDict :collections.Dictionary<Node, Node> = new collections.Dictionary<Node, Node>();

    // create froniter as a PriorityQueue and add create a comparator that compares nodes wrt the f-value
    let frontier : collections.PriorityQueue<Node> = new collections.PriorityQueue<Node>((a, b)=> {
      let fa : number = fValDict.containsKey(a) ? fValDict.getValue(a) : Infinity;
      let fb : number = fValDict.containsKey(b) ? fValDict.getValue(b) : Infinity;

      if (fa === fb) return 0;
      return fa < fb ? 1 : -1;
      //return fb-fa;
    });

    // init A*
    let visited : collections.Set<Node> = new collections.Set<Node>();
    costDict.setValue(start, 0);
    fValDict.setValue(start, heuristics(start));
    frontier.enqueue(start);

    while (!frontier.isEmpty()) {
        if (Date.now() - startTime > 1000*timeout){
          console.log("Timeout!");
          break;
        }

        let current : Node = frontier.dequeue();

        // add new nodes to frontier
        for (let edge of graph.outgoingEdges(current)){

              let next : Node = edge.to;
              let costNext : number = costDict.getValue(current) + edge.cost;
              let fVal : number = costNext + heuristics(next);
              let oldFVal : number = fValDict.containsKey(next) ? fValDict.getValue(next) : Infinity;
              // if already visited with a lower f-value
              if (visited.contains(next)){
                continue;
              } // if multiple paths
              if (frontier.contains(next) && fVal >= oldFVal){
                continue;
              }
              // update values and add to the frontier
              parentDict.setValue(next,current);
              costDict.setValue(next, costNext);
              fValDict.setValue(next, fVal);

              if (goal(next)){
                result.path = followParent(start, next, parentDict);
                result.cost = costDict.getValue(next);
                return result;
              }

              frontier.enqueue(next);
        }
        visited.add(current);
    }
    console.log("Failure! No path found");
    return;
}

function followParent<Node>(
  start : Node,
  goal : Node,
  parentDict : collections.Dictionary<Node, Node>) : Node[] {

  let current : Node = goal;
  let path : Node[] = [goal];
  while (current != start)
  {
    current = parentDict.getValue(current);
    path.unshift(current);
  }
  return path;
}
