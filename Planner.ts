///<reference path="World.ts"/>
///<reference path="Interpreter.ts"/>
/// <reference path="Graph.ts" />


/**
* Planner module
*
* The goal of the Planner module is to take the interpetation(s)
* produced by the Interpreter module and to plan a sequence of actions
* for the robot to put the world into a state compatible with the
* user's command, i.e. to achieve what the user wanted.
*
* The planner should use your A* search implementation to find a plan.
*/
module Planner {

    //////////////////////////////////////////////////////////////////////
    // exported functions, classes and interfaces/types

    /**
     * Top-level driver for the Planner. Calls `planInterpretation` for each given interpretation generated by the Interpreter.
     * @param interpretations List of possible interpretations.
     * @param currentState The current state of the world.
     * @returns Augments Interpreter.InterpretationResult with a plan represented by a list of strings.
     */
    export function plan(interpretations: Interpreter.InterpretationResult[], currentState: WorldState): PlannerResult[] {
        var errors: Error[] = [];
        var plans: PlannerResult[] = [];
        interpretations.forEach((interpretation) => {
            try {
                var result: PlannerResult = <PlannerResult>interpretation;
                result.plan = planInterpretation(result.interpretation, currentState);
                if (result.plan.length == 0) {
                    result.plan.push("That is already true!");
                }
                plans.push(result);
            } catch (err) {
                errors.push(err);
            }
        });
        if (plans.length) {
            return plans;
        } else {
            // only throw the first error found
            throw errors[0];
        }
    }

    export interface PlannerResult extends Interpreter.InterpretationResult {
        plan: string[];
    }

    export function stringify(result: PlannerResult): string {
        return result.plan.join(", ");
    }

    //////////////////////////////////////////////////////////////////////
    // private functions

    /**
     * The core planner function.
     *
     * @param interpretation The logical interpretation of the user's desired goal. The plan needs to be such that by executing it, the world is put into a state that satisfies this goal.
     * @param state The current world state.
     * @returns Basically, a plan is a
     * stack of strings, which are either system utterances that
     * explain what the robot is doing (e.g. "Moving left") or actual
     * actions for the robot to perform, encoded as "l", "r", "p", or
     * "d". The code shows how to build a plan. Each step of the plan can
     * be added using the `push` method.
     */
    function planInterpretation(interpretation: Interpreter.DNFFormula, state: WorldState): string[] {


        let goal = (n: WorldNode): boolean => {
            for (let intrp of interpretation) {
                for (let formula of intrp) {
                    if(formula.relation == 'holding')
                    {
                        return n.holding == formula.args[0];
                    }
                    let p0 = indexOf2D(n.stacks, formula.args[0]);
                    let p1 = indexOf2D(n.stacks, formula.args[1]);
                    if (p0 == [-1, -1] || p1 == [-1, -1]) return false;

                    switch (formula.relation) {
                        case 'leftof':
                            return p0[0] < p1[0];
                        case 'rightof':
                            return p0[0] > p1[0];
                        case 'inside':
                        case 'ontop':
                            return p0[0] == p1[0] && p0[1] == p1[1] + 1 ||
                                    formula.args[1] == "floor" && p0[1] == 0;
                        case 'under':
                            return p0[0] == p1[0] && p0[1] < p1[1];
                        case 'beside':
                            return p0[0] == p1[0] + 1 || p0[0] == p1[0] - 1;
                        case 'above':
                            return p0[0] == p1[0] && p0[1] > p1[1];
                    }
                }
            }
            return false;
        };

        let heuristics = (n: WorldNode): number => {
            return 1;
        };
        let startState = new WorldNode(state.stacks, state.arm, state.holding);
        let graph: WorldGraph = new WorldGraph();
        let searchResult = aStarSearch<WorldNode>(graph,
            startState,
            goal, heuristics, 1);
        var plan: string[] = [];

        let prevNode = searchResult.path.shift();
        searchResult.path.forEach(node => {
            if (prevNode.armCol < node.armCol)
                plan.push('r');
            else if (prevNode.armCol > node.armCol)
                plan.push('l');
            else if (prevNode.holding == null)
              plan.push('p');
            else
                plan.push('d');
            prevNode = node;
        });
        return plan;
    }

    //p[0] = col p[1] = row
    function indexOf2D(arr: string[][], item: string): [number, number] {
        let p: [number, number] = [0, 0];
        for(let a of arr) {
            for(let s of a) {
                if (s == item)
                    return p;
                p[1]++;
            }
            p[0]++;
        }
        return [-1, -1];
    }
}

/**
 * MyGraph
 */
class WorldGraph implements Graph<WorldNode> {
    constructor() {

    }


    /** Computes the edges that leave from a node. */
    outgoingEdges(node: WorldNode): Edge<WorldNode>[] {
        let edges: Edge<WorldNode>[] = [];
        node.neighbours().forEach(neighbour => {
            edges.push({ from: node, to: neighbour, cost: 1 });
        });
        return edges;
    }

    compareNodes(a: WorldNode, b: WorldNode): number {
        return a.compare(b);
    }
}

/**
 * WorldNode
 */
class WorldNode {

    constructor(
        public stacks: Stack[],
        public armCol: number,
        public holding: string) {
          this.stacks = JSON.parse(JSON.stringify(stacks));
        }


    compare(other: WorldNode): number {
        return this.toString() == other.toString() ? 0 : 1;
    }

    neighbours(): WorldNode[] {
        let nodes: WorldNode[] = [];
        let stackCopy : string[][] = JSON.parse(JSON.stringify(this.stacks));

        if (this.armCol != 0) {
            nodes.push(new WorldNode(stackCopy, this.armCol - 1, this.holding));
        }
        if (this.armCol != stackCopy.length - 1) {
            nodes.push(new WorldNode(stackCopy, this.armCol + 1, this.holding));
        }
        if (this.holding == null && stackCopy[this.armCol].length > 0) {
            let newStacks = JSON.parse(JSON.stringify(stackCopy));;
            let newHolding = newStacks[this.armCol].pop();
            nodes.push(new WorldNode(newStacks, this.armCol, newHolding));
        }
        else if (this.holding != null) {
            let newStacks = JSON.parse(JSON.stringify(stackCopy));
            newStacks[this.armCol].push(this.holding);
            nodes.push(new WorldNode(newStacks, this.armCol, null));
        }
        return nodes;
    }

    toString(): string{
        return JSON.stringify(this.stacks) + this.armCol + (this.holding==null?'':this.holding);
    }
}
