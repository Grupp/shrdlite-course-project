///<reference path="World.ts"/>
///<reference path="Parser.ts"/>
///<reference path="lib/collections.ts"/>

/**
* Interpreter module
*
* The goal of the Interpreter module is to interpret a sentence
* written by the user in the context of the current world state. In
* particular, it must figure out which objects in the world,
* i.e. which elements in the `objects` field of WorldState, correspond
* to the ones referred to in the sentence.
*
* Moreover, it has to derive what the intended goal state is and
* return it as a logical formula described in terms of literals, where
* each literal represents a relation among objects that should
* hold. For example, assuming a world state where "a" is a ball and
* "b" is a table, the command "put the ball on the table" can be
* interpreted as the literal ontop(a,b). More complex goals can be
* written using conjunctions and disjunctions of these literals.
*
* In general, the module can take a list of possible parses and return
* a list of possible interpretations, but the code to handle this has
* already been written for you. The only part you need to implement is
* the core interpretation function, namely `interpretCommand`, which produces a
* single interpretation for a single command.
*/
module Interpreter {

    //////////////////////////////////////////////////////////////////////
    // exported functions, classes and interfaces/types

    /**
    Top-level function for the Interpreter. It calls `interpretCommand` for each possible parse of the command. No need to change this one.
    * @param parses List of parses produced by the Parser.
    * @param currentState The current state of the world.
    * @returns Augments ParseResult with a list of interpretations. Each interpretation is represented by a list of Literals.
    */
    export function interpret(parses : Parser.ParseResult[], currentState : WorldState) : InterpretationResult[] {
        var errors : Error[] = [];
        var interpretations : InterpretationResult[] = [];
        parses.forEach((parseresult) => {
            try {
                var result: InterpretationResult = <InterpretationResult>parseresult;
                var intp = interpretCommand(result.parse, currentState);
                if (intp != null) { }

                result.interpretation = interpretCommand(result.parse, currentState);
                interpretations.push(result);
            } catch (err) {
                errors.push(err);
            }
        });
        if (interpretations.length) {
            return interpretations;
        } else {
            // only throw the first error found
            throw errors[0];
        }
    }

    export interface InterpretationResult extends Parser.ParseResult {
        interpretation: DNFFormula;
    }

    export type DNFFormula = Conjunction[];
    type Conjunction = Literal[];

    /**
    * A Literal represents a relation that is intended to
    * hold among some objects.
    */
    export interface Literal {
        /** Whether this literal asserts the relation should hold
         * (true polarity) or not (false polarity). For example, we
         * can specify that "a" should *not* be on top of "b" by the
         * literal {polarity: false, relation: "ontop", args:
         * ["a","b"]}.
         */
        polarity : boolean;
        /** The name of the relation in question. */
        relation : string;
        /** The arguments to the relation. Usually these will be either objects
         * or special strings such as "floor" or "floor-N" (where N is a column) */
        args : string[];
    }

    export function stringify(result: InterpretationResult): string {
        return result.interpretation.map((literals) => {
            return literals.map((lit) => stringifyLiteral(lit)).join(" & ");
            // return literals.map(stringifyLiteral).join(" & ");
        }).join(" | ");
    }

    export function stringifyLiteral(lit: Literal): string {
        return (lit.polarity ? "" : "-") + lit.relation + "(" + lit.args.join(",") + ")";
    }

    //////////////////////////////////////////////////////////////////////
    // private functions
    /**
     * Interprets the command parsed from the parser and returns a DNFFormula of what actions should be made.
     * Throws exception if no valid interpretation if found.
     * @param cmd The actual command. Note that it is *not* a string, but rather an object of type `Command` (as it has been parsed by the parser).
     * @param state The current state of the world. Useful to look up objects in the world.
     * @returns A list of list of Literal, representing a formula in disjunctive normal form (disjunction of conjunctions). See the dummy interpetation returned in the code for an example, which means ontop(a,floor) AND holding(b).
     * @throws An error when no valid interpretations can be found
     */
    function interpretCommand(cmd: Parser.Command, state: WorldState): DNFFormula {
        let worldObjs = new collections.Dictionary<string, WorldObject>();

        let emptyColumns = 0;
        for (var i = 0; i < state.stacks.length; i++) {
            var stack = state.stacks[i];
            if (stack.length == 0)
                emptyColumns += 1;
            else
                for (var j = 0; j < stack.length; j++) {
                    var obj = stack[j];
                    worldObjs.setValue(obj, new WorldObject(state.objects[obj], i, j, obj));
                }
        }
        worldObjs.setValue("floor", new WorldObject({ "form": "floor", "size": "null", "color": "null" }, emptyColumns, -1, "floor"));


        let interpretation: DNFFormula = [];
        let actionObjects: string[];
        let targetObjects: string[];

        switch (cmd.command) {
            case 'take':
                actionObjects = findMatchingObjects(cmd.entity, worldObjs, true);
                actionObjects.forEach(obj => {
                    interpretation.push([{ polarity: true, relation: "holding", args: [obj] }])
                });
                return interpretation;
            case 'put':
                if (!state.holding) throw "Arm is holding nothing";
                let holding: WorldObject = new WorldObject(state.objects[state.holding], -1, -1, state.holding);
                targetObjects = findMatchingObjects(cmd.location.entity, worldObjs, false);
                targetObjects.forEach(tObj => {
                    if (state.holding != tObj && obeyLaws(holding, worldObjs.getValue(tObj), cmd.location.relation)) {
                        interpretation.push([{ polarity: true, relation: cmd.location.relation, args: [state.holding, tObj] }])
                    }
                });
                break;
            case 'move':
                actionObjects = findMatchingObjects(cmd.entity, worldObjs, true);
                targetObjects = findMatchingObjects(cmd.location.entity, worldObjs, false);
                actionObjects.forEach(aObj => {
                    targetObjects.forEach(tObj => {
                        if (aObj != tObj && obeyLaws(worldObjs.getValue(aObj), worldObjs.getValue(tObj), cmd.location.relation)) {
                            interpretation.push([{ polarity: true, relation: cmd.location.relation, args: [aObj, tObj] }])
                        }
                    });
                });
                break;
            default:

                throw "Not implemented.";
        }

        if (interpretation.length == 0)
            throw "No interpetation!";

        return interpretation;
    }

    /**
     * WorldObject
     */
    class WorldObject {
        constructor(public obj: ObjectDefinition,
            public column: number,
            public row: number,
            private key: string) { }

        public toString = (): string => {
            return this.key;
        }
    }

    function findMatchingObjects(
        entity: Parser.Entity,
        worldObjects: collections.Dictionary<string, WorldObject>,
        action: boolean
    ): string[] {

        let matches: string[] = [];
        let entityObj = entity.object.location ? entity.object.object : entity.object;
        let hasRelations: boolean = entity.object.location != null;

        if (entityObj.form == "floor") {
            return ["floor"];
        }

        worldObjects.forEach((key, worldObj) => {
            //
            let isMatch: boolean = true;
            // Cannot pickup floor
            if (action && key == "floor") {
                isMatch = false;
            }

            if (isMatch && entityObj.form != "anyform" && !strComp(entityObj.form, worldObj.obj.form)) {
                isMatch = false;
            }
            if (isMatch && !strComp(entityObj.color, worldObj.obj.color)) {
                isMatch = false;
            }
            if (isMatch && !strComp(entityObj.size, worldObj.obj.size)) {
                isMatch = false;
            }

            if (hasRelations && isMatch) {
                let relativeObjs =
                    findMatchingObjects(entity.object.location.entity, worldObjects, false);
                let obeys: boolean = false;
                relativeObjs.forEach(relativeObj => {
                    if (obeyRelation(worldObj, worldObjects.getValue(relativeObj), entity.object.location.relation))
                        obeys = true;
                });
                isMatch = obeys;
            }

            if (isMatch) {
                matches.push(key);
            }
        });
        return matches;
    }

    function obeyRelation(
        mainObject: WorldObject,
        relativeObject: WorldObject,
        relation: string
    ): boolean {

        if (relativeObject.obj.form == "floor") {
            if (relation != "ontop" || mainObject.row != 0)
                return false;
            return true;
        }

        switch (relation) {
            case "leftof":
                if (!(mainObject.column < relativeObject.column)) {
                    return false; //mainObject is not left of relativeObject
                }
                break;
            case "rightof":
                if (!(mainObject.column > relativeObject.column)) {
                    return false; //mainObject is not right of relativeObject
                }
                break;
            case "inside":
            case "ontop":
                if (!(mainObject.column == relativeObject.column && mainObject.row == relativeObject.row + 1)) {
                    return false;
                }
                break;
            case "under":
                if (!(mainObject.column == relativeObject.column && mainObject.row < relativeObject.row)) {
                    return false;
                }
                break;
            case "beside":
                if (!(Math.abs(mainObject.column - relativeObject.column) == 1)) {
                    return false;
                }
                break;
            case "above":
                if (!(mainObject.column == relativeObject.column && mainObject.row > relativeObject.row)) {
                    return false;
                }
                break;
            default:
                break;
        }
        return true;
    }

    function obeyLaws(
        mainObject: WorldObject,
        relativeObject: WorldObject,
        relation: string
    ): boolean {
        if (relation == "ontop" || relation == "inside") {
            // The floor can support at most N objects (beside each other).
            if(relativeObject.obj.form == "floor" && relativeObject.column <= 0) // floor's column number are the number of free columns
                return false;
            // Small objects cannot support large objects.
            if (mainObject.obj.size == "large" && relativeObject.obj.size == "small")
                return false;
            // Balls cannot support anything.
            if (relativeObject.obj.form == "ball")
                return false;
            // Balls must be in boxes or on the floor, otherwise they roll away.
            if (mainObject.obj.form == "ball" &&
                relativeObject.obj.form != "box" &&
                relativeObject.obj.form != "floor")
                return false;
            // Objects are “inside” boxes, but “ontop” of other objects.
            if (relativeObject.obj.form == "box" && relation != "inside")
                return false;
            if (relativeObject.obj.form != "box" && relation != "ontop")
                return false;
            // Boxes cannot contain pyramids, planks or boxes of the same size.
            if (mainObject.obj.form == "box" &&
                (relativeObject.obj.form == "pyramid" || relativeObject.obj.form == "plank" || relativeObject.obj.form == "box") &&
                mainObject.obj.size == relativeObject.obj.size)
                return false;
            // Small boxes cannot be supported by small bricks or pyramids.
            if (mainObject.obj.size == "small" && relativeObject.obj.size == "small" && mainObject.obj.form == "box" &&
                (relativeObject.obj.form == "brick" || relativeObject.obj.form == "pyramid" || relativeObject.obj.form == "box"))
                return false;
            // Large boxes cannot be supported by large pyramids.
            if (mainObject.obj.size == "large" && mainObject.obj.form == "box" &&
                relativeObject.obj.size == "large" && relativeObject.obj.form == "box")
                return false;
        }
        return true;
    }

    function strComp(a: string, b: string) {
        return a == null || b == null || a.localeCompare(b) == 0;
    }
}
