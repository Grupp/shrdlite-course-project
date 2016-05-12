///<reference path="lib/collections.ts"/>
///<reference path="lib/node.d.ts"/>

/** Graph module
*
*  Types for generic A\* implementation.
*
*/

/** An edge in a graph. */
class Edge<Node> {
    from: Node;
    to: Node;
    cost: number;
}

/** A directed graph. */
interface Graph<Node> {
    /** Computes the edges that leave from a node. */
    outgoingEdges(node: Node): Edge<Node>[];
    /** A function that compares nodes. */
    compareNodes: collections.ICompareFunction<Node>;
}

/** Type that reports the result of a search. */
class SearchResult<Node> {
    /** The path (sequence of Nodes) found by the search algorithm. */
    path: Node[];
    /** The total cost of the path. */
    cost: number;
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
function aStarSearch<Node>(
    graph: Graph<Node>,
    start: Node,
    goal: (n: Node) => boolean,
    heuristics: (n: Node) => number,
    timeout: number
): SearchResult<Node> {

    timeout *= 1000;
    let time: Date = new Date();
    let startTime: number = time.getTime();

    let result: SearchResult<Node> = {
        path: [start],
        cost: 0
    };

    let gScores: collections.Dictionary<Node, number> = new collections.Dictionary<Node, number>();
    gScores.setValue(start, 0);
    let fScores: collections.Dictionary<Node, number> = new collections.Dictionary<Node, number>();
    fScores.setValue(start, heuristics(start));
    let cameFrom: collections.Dictionary<Node, Node> = new collections.Dictionary<Node, Node>();

    let openSet: collections.Heap<Node> = new collections.Heap<Node>((a, b) => {
        let fa: number = fScores.getValue(a);
        let fb: number = fScores.getValue(b);
        fa = fa != undefined ? fa : Infinity;
        fb = fb != undefined ? fb : Infinity;
        return fa - fb;
    });
    openSet.add(start);

    let closedSet: collections.Set<Node> = new collections.Set<Node>();

    let current: Node;
    while (!openSet.isEmpty() || startTime + timeout > time.getTime()) {
        current = openSet.removeRoot();

        if (goal(current)) {
            result.path = backtrack(cameFrom, current, start);
            result.cost = gScores.getValue(current);
            return result;
        }

        closedSet.add(current);

        for (let edge of graph.outgoingEdges(current)) {
            if (closedSet.contains(edge.to)) continue;

            let tempGScore: number = gScores.getValue(current)
            tempGScore = tempGScore != undefined ? tempGScore + edge.cost : Infinity;
            let theGScore = gScores.getValue(edge.to);
            if (openSet.contains(edge.to) && (theGScore == undefined || tempGScore >= theGScore)) continue;

            cameFrom.setValue(edge.to, current);
            gScores.setValue(edge.to, tempGScore);
            fScores.setValue(edge.to, tempGScore + heuristics(edge.to));

            openSet.add(edge.to);
        }
    }

    //Failure: timeout or no path
    return result;
}

function backtrack<Node>(
    cameFrom: collections.Dictionary<Node, Node>,
    goal: Node,
    start: Node
): Node[] {

    let path: Node[] = [goal];

    let current: Node = goal;
    while (current != start) {
        current = cameFrom.getValue(current);
        path.unshift(current);
    }

    return path;
}
