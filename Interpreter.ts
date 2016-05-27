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
    export function interpret(parses: Parser.ParseResult[], currentState: WorldState): InterpretationResult[] {
        var errors: Error[] = [];
        var interpretations: InterpretationResult[] = [];
        parses.forEach((parseresult) => {
            try {
                var result: InterpretationResult = <InterpretationResult>parseresult;
                result.interpretation = interpretCommand(result.parse, currentState);
                //console.log('\n!!!!!!!!!!!\n' + stringifyParse(parseresult));
                //console.log(stringify(result) + '\n????????????\n');
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
        polarity: boolean;
        /** The name of the relation in question. */
        relation: string;
        /** The arguments to the relation. Usually these will be either objects
         * or special strings such as "floor" or "floor-N" (where N is a column) */
        args: string[];
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

    function stringifyParse(parse: Parser.ParseResult): string {
        let s: string[] = [];
        let j = JSON.stringify(parse.parse).split(/({|})/g);
        let tabs = 1;
        j.forEach(sj => {
            if (sj.lastIndexOf('}') != -1)
                tabs--;
            s.push(((new Array(tabs).join(" " + tabs)) + sj));
            if (sj.lastIndexOf('{') != -1)
                tabs++;
        });

        return s.join('\n');
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
                if (state.holding != null) throw "Arm is holding already holding something";
                actionObjects = findMatchingObjects(cmd.entity, worldObjs, true);
                actionObjects.forEach(obj => {
                    //console.log(state.stacks[worldObjs.getValue(obj).column].length);
                    //console.log(worldObjs.getValue(obj).row + 1);
                    //only free objects
                    //if (state.stacks[worldObjs.getValue(obj).column].length == worldObjs.getValue(obj).row + 1)
                    interpretation.push([{ polarity: true, relation: "holding", args: [obj] }])
                });
                break;
            case 'put':
                if (state.holding == null) throw "Arm is holding nothing";
                let holding: WorldObject = new WorldObject(state.objects[state.holding], -1, -1, state.holding);
                targetObjects = findMatchingObjects(cmd.location.entity, worldObjs, false);
                targetObjects.forEach(tObj => {
                    if (state.holding != tObj && obeyLaws(holding.obj, worldObjs.getValue(tObj).obj, cmd.location.relation)) {
                        interpretation.push([{ polarity: true, relation: cmd.location.relation, args: [state.holding, tObj] }])
                    }
                });
                break;
            case 'move':
                if (state.holding != null) throw "Arm is holding already holding something";
                actionObjects = findMatchingObjects(cmd.entity, worldObjs, true);
                targetObjects = findMatchingObjects(cmd.location.entity, worldObjs, false);
                actionObjects.forEach(aObj => {
                    targetObjects.forEach(tObj => {
                        if (aObj != tObj && obeyLaws(worldObjs.getValue(aObj).obj, worldObjs.getValue(tObj).obj, cmd.location.relation)) {
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
    /* Find objects in the world that matches the entity passed to the function
    *
    */
    function findMatchingObjects(
        entity: Parser.Entity,
        worldObjects: collections.Dictionary<string, WorldObject>,
        action: boolean
    ): string[] {

        let matches: string[] = [];
        let entityObj = entity.object;

        let locations: Parser.Location[] = [];

        while (entityObj.form == undefined) {
            if (entityObj.location != null) {
                locations.push(entityObj.location);
            }
            entityObj = entityObj.object;
            if(entity.object.location != null) {
                 //do stuff recursive
                 console.log("I am the problem");
            }
        }

        //search for the mentioned object in the world
        worldObjects.forEach((key, worldObj) => {

            let isMatch: boolean = true;

            // Cannot pickup floor
            if (key == "floor" && (action || entityObj.form == "anyform")) {
                isMatch = false;
            }

            // if not the same object
            if (isMatch && entityObj.form != "anyform" && !strComp(entityObj.form, worldObj.obj.form)) {
                isMatch = false;
            }

            // not the same color
            if (isMatch && !strComp(entityObj.color, worldObj.obj.color)) {
                isMatch = false;
            }

            // not the same size
            if (isMatch && !strComp(entityObj.size, worldObj.obj.size)) {
                isMatch = false;
            }

            if (isMatch && locations.length != 0) {
                locations.forEach(location => {
                    let relativeObjs =
                        findMatchingObjects(location.entity, worldObjects, false);
                    let obeys: boolean = false;
                    relativeObjs.forEach(relativeObj => {
                        if (obeyRelation(worldObj, worldObjects.getValue(relativeObj), location.relation))
                            obeys = true;
                    });
                    if (!obeys)
                        isMatch = false;
                });
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

    export function obeyLaws(
        mainObject: ObjectDefinition,
        relativeObject: ObjectDefinition,
        relation: string
    ): boolean {
        if (relation == "ontop" || relation == "inside") {
            // The floor can support at most N objects (beside each other).
            //if (relativeObject.form == "floor" && relativeObject.column <= 0) // floor's column number are the number of free columns
            //return false;
            // Small objects cannot support large objects.
            if (mainObject.size == "large" && relativeObject.size == "small")
                return false;
            // Balls cannot support anything.
            if (relativeObject.form == "ball")
                return false;
            // Balls must be in boxes or on the floor, otherwise they roll away.
            if (mainObject.form == "ball" &&
                relativeObject.form != "box" &&
                relativeObject.form != "floor")
                return false;
            // Objects are “inside” boxes, but “ontop” of other objects.
            if (relativeObject.form == "box" && relation != "inside")
                return false;
            if (relativeObject.form != "box" && relation != "ontop")
                return false;
            // Small boxes cannot be supported by small bricks or pyramids.
            if (mainObject.size == "small" && relativeObject.size == "small" && mainObject.form == "box" &&
                (relativeObject.form == "brick" || relativeObject.form == "pyramid" || relativeObject.form == "box"))
                return false;
            // Large boxes cannot be supported by large pyramids.
            if (mainObject.size == "large" && mainObject.form == "box" &&
                relativeObject.size == "large" && relativeObject.form == "box")
                return false;
        }
        if (relation == "inside") {
          // Boxes cannot contain pyramids, planks or boxes of the same size.
          if (mainObject.form == "box" &&
              (relativeObject.form == "pyramid" || relativeObject.form == "plank" || relativeObject.form == "box") &&
              mainObject.size == relativeObject.size)
              return false;
          }

        return true;
    }

    function strComp(a: string, b: string) {
        return a == null || b == null || a.localeCompare(b) == 0;
    }
}
