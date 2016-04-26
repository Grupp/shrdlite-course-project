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
var Edge = (function () {
    function Edge() {
    }
    return Edge;
}());
/** Type that reports the result of a search. */
var SearchResult = (function () {
    function SearchResult() {
    }
    return SearchResult;
}());
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
function aStarSearch(graph, start, goal, heuristics, timeout) {
    var result = {
        path: [],
        cost: 0
    };
    var frontier = new collections.PriorityQueue(function (nodeA, nodeB) {
        var totalCostA = (totalCost.containsKey(nodeA) ? totalCost.getValue(nodeA) : Infinity);
        var totalCostB = (totalCost.containsKey(nodeB) ? totalCost.getValue(nodeB) : Infinity);
        return totalCostB - totalCostA;
    });
    frontier.enqueue(start);
    var pathCost = new collections.Dictionary();
    pathCost.setValue(start, 0);
    var totalCost = new collections.Dictionary();
    pathCost.setValue(start, pathCost.getValue(start) + heuristics(start));
    var cameFrom = new collections.Dictionary();
    var closedNodes = new collections.LinkedList();
    while (!frontier.isEmpty()) {
        var currentNode = frontier.dequeue();
        closedNodes.add(currentNode);
        if (goal(currentNode)) {
            result.path = backtrack(start, currentNode, cameFrom);
            result.cost = pathCost.getValue(currentNode);
            return result;
        }
        for (var _i = 0, _a = graph.outgoingEdges(start); _i < _a.length; _i++) {
            var edge = _a[_i];
            if (!closedNodes.contains(edge.to)) {
                var tempPathCost = pathCost.containsKey(currentNode) ? pathCost.getValue(currentNode) + edge.cost : Infinity;
                if (!frontier.contains(edge.to))
                    frontier.enqueue(edge.to);
                else if (tempPathCost >= pathCost.getValue(edge.to))
                    continue;
                pathCost.setValue(edge.to, tempPathCost);
                totalCost.setValue(edge.to, tempPathCost + heuristics(edge.to));
                cameFrom.setValue(edge.to, currentNode);
            }
        }
    }
    return result;
}
function backtrack(start, goal, cameFrom) {
    return recursiveBacktracking(start, [goal], cameFrom);
}
function recursiveBacktracking(start, pathSoFar, cameFrom) {
    if (pathSoFar[0] === start) {
        return pathSoFar;
    }
    return pathSoFar.concat(cameFrom.getValue(pathSoFar[0]));
}
var GridNode = (function () {
    function GridNode(pos) {
        this.pos = pos;
    }
    GridNode.prototype.add = function (delta) {
        return new GridNode({
            x: this.pos.x + delta.x,
            y: this.pos.y + delta.y
        });
    };
    GridNode.prototype.compareTo = function (other) {
        return (this.pos.x - other.pos.x) || (this.pos.y - other.pos.y);
    };
    GridNode.prototype.toString = function () {
        return "(" + this.pos.x + "," + this.pos.y + ")";
    };
    return GridNode;
}());
/** Example Graph. */
var GridGraph = (function () {
    function GridGraph(size, obstacles) {
        this.size = size;
        this.walls = new collections.Set();
        for (var _i = 0, obstacles_1 = obstacles; _i < obstacles_1.length; _i++) {
            var pos = obstacles_1[_i];
            this.walls.add(new GridNode(pos));
        }
        for (var x = -1; x <= size.x; x++) {
            this.walls.add(new GridNode({ x: x, y: -1 }));
            this.walls.add(new GridNode({ x: x, y: size.y }));
        }
        for (var y = -1; y <= size.y; y++) {
            this.walls.add(new GridNode({ x: -1, y: y }));
            this.walls.add(new GridNode({ x: size.x, y: y }));
        }
    }
    GridGraph.prototype.outgoingEdges = function (node) {
        var outgoing = [];
        for (var dx = -1; dx <= 1; dx++) {
            for (var dy = -1; dy <= 1; dy++) {
                if (!(dx == 0 && dy == 0)) {
                    var next = node.add({ x: dx, y: dy });
                    if (!this.walls.contains(next)) {
                        outgoing.push({
                            from: node,
                            to: next,
                            cost: Math.sqrt(dx * dx + dy * dy)
                        });
                    }
                }
            }
        }
        return outgoing;
    };
    GridGraph.prototype.compareNodes = function (a, b) {
        return a.compareTo(b);
    };
    GridGraph.prototype.toString = function () {
        var borderRow = "+" + new Array(this.size.x + 1).join("--+");
        var betweenRow = "+" + new Array(this.size.x + 1).join("  +");
        var str = "\n" + borderRow + "\n";
        for (var y = this.size.y - 1; y >= 0; y--) {
            str += "|";
            for (var x = 0; x < this.size.x; x++) {
                str += this.walls.contains(new GridNode({ x: x, y: y })) ? "## " : "   ";
            }
            str += "|\n";
            if (y > 0)
                str += betweenRow + "\n";
        }
        str += borderRow + "\n";
        return str;
    };
    return GridGraph;
}());
