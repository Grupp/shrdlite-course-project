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

            let isGoal : boolean = false;
            for (let intrp of interpretation) {
                for (let formula of intrp) {
                  if(!isGoal){
                    if(formula.relation == 'holding')
                    {
                        isGoal =  n.holding == formula.args[0];
                        continue;
                    }
                    let p0 = indexOf2D(n.stacks, formula.args[0]);
                    let p1 = indexOf2D(n.stacks, formula.args[1]);

                    if (!isFinite(p0[0])  || !isFinite(p1[0])) return false;

                    switch (formula.relation) {
                        case 'leftof':
                            isGoal = p0[0] < p1[0];
                            break;
                        case 'rightof':
                            isGoal = p0[0] > p1[0];
                            break;
                        case 'inside':
                        case 'ontop':
                            isGoal = (p0[0] == p1[0] && p0[1] == p1[1] + 1) ||
                                    (formula.args[1] == "floor" && p0[1] == 0);
                            break;
                        case 'under':
                            isGoal = p0[0] == p1[0] && p0[1] < p1[1];
                            break;
                        case 'beside':
                            isGoal = p0[0] == p1[0] + 1 || p0[0] == p1[0] - 1;
                            break;
                        case 'above':
                            isGoal = p0[0] == p1[0] && p0[1] > p1[1];
                            break;
                    }
                  }
                }
            }
            return isGoal;
        };

        let heuristics = (n: WorldNode): number => {

          // loop through all interpetations to find goal objects
          let hArr : number[] = [];
          let h : number;
          let colA : number;
          let rowA : number;
          let colD : number;
          let rowD : number;
          for (let intrp of interpretation) {
              for (let formula of intrp) {
                  h = 0;
                  let active : string = formula.args[0];
                  let dest : string = formula.args[1];

                  [colA, rowA] = indexOf2D(n.stacks, formula.args[0]);
                  [colD, rowD] = indexOf2D(n.stacks, formula.args[1]);

                  if (goal(n)){
                    hArr.push(0);
                    continue;
                  }

                  // count objects above the objects
                  if(colA == -1){
                    //floor
                    // should not happen?
                  }
                  else if (!isFinite(colA)){
                    // holding
                    h +=1;
                  } else {
                  	if(!(formula.relation == "under")){
				        h += 4*(n.stacks[colA].length - 1 - rowA);
                  	}
                  }
                  if(colD == -1){
                    //floor
                    // find empty floor in some way
                  }
                  else if (!isFinite(colD)){
                    // holding
                    h += 1;
                  } else {
                  	if(!(formula.relation == "above")){
				        h += 4*(n.stacks[colD].length - 1 - rowD);
                  	}
                  }

                  if(formula.relation == "holding" && isFinite(colA)){
                    h += Math.abs(colA- n.armCol);
                  }

                  if(formula.relation == "ontop" || formula.relation == "inside" ||
                      formula.relation == "under" || formula.relation == "above"){
                    let distA : number = isFinite(colA) ? colA  : n.armCol;
                    let distB : number = isFinite(colD) ? colD : n.armCol;
                    //console.log(distA)
                    //console.log(distB)
                    h += Math.abs(distA- distB);
                  }
                  if (!isFinite(colA))
                    colA = n.armCol;
                  if (!isFinite(colD))
                    colD = n.armCol;

                  // closest object to arm
                  h+= Math.min(Math.abs(colA-n.armCol),Math.abs(colD-n.armCol));


                  hArr.push(h);

                }


          }
            return Math.min.apply(null, hArr);;
        };

        let startState = new WorldNode(state.stacks, state.arm, state.holding, state.objects);
        let graph: WorldGraph = new WorldGraph();
        let searchResult = aStarSearch<WorldNode>(graph,
            startState,
            goal, heuristics, 100);
        var plan: string[] = [];

        let prevNode = searchResult.path.shift();
        searchResult.path.forEach(node => {
            if (prevNode.armCol < node.armCol)
                plan.push('r');
            else if (prevNode.armCol > node.armCol)
                plan.push('l');
            else if (prevNode.holding == null) {
                plan.push('p');
            }
            else
                plan.push('d');
            prevNode = node;
        });
        return plan;
    }

    //p[0] = col p[1] = row
    /**
    * Find which colum and row an object has
    *
    * @param arr the stacks where the function search in
    * @param string which object it search for
    * @returns the column and row if it finds the object in the stacks otherwise
    * it returns Infinity. floor is defined as [-1, -1]
    */
    function indexOf2D(arr: string[][], item: string): [number, number] {
        let p: [number, number] = [0, 0];
        if (item == "floor") return [-1, -1];
        for(let a of arr) {
            p[1] = 0;
            for(let s of a) {
                if (s == item)
                    return p;
                p[1]++;
            }
            p[0]++;
        }
        return [Infinity, Infinity];
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

    public stacks: Stack[]

    constructor(
        stacks: Stack[],
        public armCol: number,
        public holding: string,
        public objects: { [s: string]: ObjectDefinition; }) {
        this.stacks = JSON.parse(JSON.stringify(stacks));
    }


    compare(other: WorldNode): number {
        return this.toString() == other.toString() ? 0 : 1;
    }

    neighbours(): WorldNode[] {
        let nodes: WorldNode[] = [];
        let stackCopy: string[][] = JSON.parse(JSON.stringify(this.stacks));

        // move to the right
        if (this.armCol != 0) {
            nodes.push(new WorldNode(stackCopy, this.armCol - 1, this.holding, this.objects));
        }

        // move to the left
        if (this.armCol != stackCopy.length - 1) {
            nodes.push(new WorldNode(stackCopy, this.armCol + 1, this.holding, this.objects));
        }

        // take object if it is an object there
        if (this.holding == null && stackCopy[this.armCol].length > 0) {
            let newStacks = stackCopy;
            let newHolding = newStacks[this.armCol].pop();
            nodes.push(new WorldNode(newStacks, this.armCol, newHolding, this.objects));
        }
        // put an object
        else if (this.holding != null && (stackCopy[this.armCol].length == 0 ||
            Interpreter.obeyLaws(this.objects[this.holding],
                this.objects[stackCopy[this.armCol][stackCopy[this.armCol].length - 1]],
                "ontop") ||
            Interpreter.obeyLaws(this.objects[this.holding],
                this.objects[stackCopy[this.armCol][stackCopy[this.armCol].length - 1]],
                "inside"))) {
            let newStacks = stackCopy;
            newStacks[this.armCol].push(this.holding);
            nodes.push(new WorldNode(newStacks, this.armCol, null, this.objects));
        }
        return nodes;
    }

    toString(): string {
        return JSON.stringify(this.stacks) + this.armCol + (this.holding == null ? '' : this.holding);
    }
}
