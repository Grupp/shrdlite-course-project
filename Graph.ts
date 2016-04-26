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
* A\* search implementation, parameterised by a `Node` type. The code
* here is just a template; you should rewrite this function
* entirely. In this template, the code produces a dummy search result
* which just picks the first possible neighbour.
*
* Note that you should not change the API (type) of this function,
* only its body.
* @param graph The graph on which to perform A\* search.
* @param start The initial node.
* @param goal A function that returns true when given a goal node. Used to determine if the algorithm has reached the goal.
* @param heuristics The heuristic function. Used to estimate the cost of reaching the goal from a given Node.
* @param timeout Maximum time to spend performing A\* search.
* @returns A search result, which contains the path from `start` to a node satisfying `goal` and the cost of this path.
*/
function aStarSearch<Node> (
    graph : Graph<Node>,
    start : Node,
    goal : (n:Node) => boolean,
    heuristics : (n:Node) => number,
    timeout : number
) : SearchResult<Node> {
    // A dummy search result: it just picks the first possible neighbour
    var result : SearchResult<Node> = {
        path: [start],
        cost: 0
    };

    // start timer

    // create froniter as a PriorityQueue and add create a comparator that compares nodes
    // wrt the f value
    let costDict :collections.Dictionary<Node, number> = new collections.Dictionary<Node, number>();
    let fValDict :collections.Dictionary<Node, number> = new collections.Dictionary<Node, number>();
    let parentDict :collections.Dictionary<Node, Node> = new collections.Dictionary<Node, Node>();
    let frontier : collections.PriorityQueue<Node> = new collections.PriorityQueue<Node>((a, b)=> {
    let fa :number = costDict.containsKey(a) ? costDict.getValue(a) : Infinity;
    let fb :number = costDict.containsKey(b) ? costDict.getValue(b) : Infinity;
      //let fb :number = b.cost + heuristics(b.node);

      if (fa == fb) return 0;
      return fa < fb ? 1 : -1;
    });

    // init A*
    //let openList : collections.Set<Node> = new collections.Set<Node>();
    let visited : collections.Set<Node> = new collections.Set<Node>();
    frontier.enqueue(start);
    costDict.setValue(start, 0);
    fValDict.setValue(start, 0);

    while (!frontier.isEmpty) {


        let current : Node = frontier.dequeue();
        if (goal(current)){
          // do stuff like generate the path
          // calculate the cost
          result.path = followParent(start, current, parentDict);
          result.cost = costDict.getValue(current);
          return result;
        }

        // add new nodes to frontier
        graph.outgoingEdges(current).forEach(edge => {
              let next : Node = edge.to;
              let fVal : number = costDict.getValue(current) + heuristics(next);
              // if already visited with a lower fValue
              if (visited.contains(next) &&  fVal > fValDict.getValue(next)){
                return;
              }
              if (frontier.contains(next) && fVal > fValDict.getValue(next) )
                return;

              parentDict.setValue(next,current);
              costDict.setValue(next, edge.cost +  costDict.getValue(current));
              fValDict.setValue(next, fVal);
              frontier.enqueue(next);
              return;
        });
        visited.add(current);
    }
    // failure
    return;
}

function followParent(
  start : Node,
  goal : Node,
  parentDict : collections.Dictionary<Node, Node>) : Node[] {

  let current : Node
  let path : Node[];
  do
  {
    current = parentDict.getValue(goal);
    path.push(current);
  } while (current != start)
  return path;
}

//////////////////////////////////////////////////////////////////////
// here is an example graph

interface Coordinate {
    x : number;
    y : number;
}


class GridNode {
    constructor(
        public pos : Coordinate
    ) {}

    add(delta : Coordinate) : GridNode {
        return new GridNode({
            x: this.pos.x + delta.x,
            y: this.pos.y + delta.y
        });
    }

    compareTo(other : GridNode) : number {
        return (this.pos.x - other.pos.x) || (this.pos.y - other.pos.y);
    }

    toString() : string {
        return "(" + this.pos.x + "," + this.pos.y + ")";
    }
}

/** Example Graph. */
class GridGraph implements Graph<GridNode> {
    private walls : collections.Set<GridNode>;

    constructor(
        public size : Coordinate,
        obstacles : Coordinate[]
    ) {
        this.walls = new collections.Set<GridNode>();
        for (var pos of obstacles) {
            this.walls.add(new GridNode(pos));
        }
        for (var x = -1; x <= size.x; x++) {
            this.walls.add(new GridNode({x:x, y:-1}));
            this.walls.add(new GridNode({x:x, y:size.y}));
        }
        for (var y = -1; y <= size.y; y++) {
            this.walls.add(new GridNode({x:-1, y:y}));
            this.walls.add(new GridNode({x:size.x, y:y}));
        }
    }

    outgoingEdges(node : GridNode) : Edge<GridNode>[] {
        var outgoing : Edge<GridNode>[] = [];
        for (var dx = -1; dx <= 1; dx++) {
            for (var dy = -1; dy <= 1; dy++) {
                if (! (dx == 0 && dy == 0)) {
                    var next = node.add({x:dx, y:dy});
                    if (! this.walls.contains(next)) {
                        outgoing.push({
                            from: node,
                            to: next,
                            cost: Math.sqrt(dx*dx + dy*dy)
                        });
                    }
                }
            }
        }
        return outgoing;
    }

    compareNodes(a : GridNode, b : GridNode) : number {
        return a.compareTo(b);
    }

    toString() : string {
        var borderRow = "+" + new Array(this.size.x + 1).join("--+");
        var betweenRow = "+" + new Array(this.size.x + 1).join("  +");
        var str = "\n" + borderRow + "\n";
        for (var y = this.size.y-1; y >= 0; y--) {
            str += "|";
            for (var x = 0; x < this.size.x; x++) {
                str += this.walls.contains(new GridNode({x:x,y:y})) ? "## " : "   ";
            }
            str += "|\n";
            if (y > 0) str += betweenRow + "\n";
        }
        str += borderRow + "\n";
        return str;
    }
}
