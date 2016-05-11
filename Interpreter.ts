///<reference path="World.ts"/>
///<reference path="Parser.ts"/>

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
        var result : InterpretationResult = <InterpretationResult>parseresult;
        result.interpretation = interpretCommand(result.parse, currentState);
        interpretations.push(result);
      } catch(err) {
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
    interpretation : DNFFormula;
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

  export function stringify(result : InterpretationResult) : string {
    return result.interpretation.map((literals) => {
      return literals.map((lit) => stringifyLiteral(lit)).join(" & ");
      // return literals.map(stringifyLiteral).join(" & ");
    }).join(" | ");
  }

  export function stringifyLiteral(lit : Literal) : string {
    return (lit.polarity ? "" : "-") + lit.relation + "(" + lit.args.join(",") + ")";
  }

  //////////////////////////////////////////////////////////////////////
  // private functions
  /**
  * The core interpretation function. The code here is just a
  * template; you should rewrite this function entirely. In this
  * template, the code produces a dummy interpretation which is not
  * connected to `cmd`, but your version of the function should
  * analyse cmd in order to figure out what interpretation to
  * return.
  * @param cmd The actual command. Note that it is *not* a string, but rather an object of type `Command` (as it has been parsed by the parser).
  * @param state The current state of the world. Useful to look up objects in the world.
  * @returns A list of list of Literal, representing a formula in disjunctive normal form (disjunction of conjunctions). See the dummy interpetation returned in the code for an example, which means ontop(a,floor) AND holding(b).
  */
  function interpretCommand(cmd : Parser.Command, state : WorldState) : DNFFormula {
    // parse cmd

    // find out which objects that are mentioned
    //console.log("Hello " + cmd.command);
    switch (cmd.command){
      case 'take':
        // find all objects in the world that matches the entity
        let matchingObjects : string[] = findObjectsInWorld(cmd.entity, state);
        let DNF : DNFFormula = [];
          for (let obj of matchingObjects){
            DNF.push([{polarity: true, relation: "holding", args: [obj]}]);

          }
        return DNF;
        //break;
      case 'put':
        console.log("PUT");
        throw "Not implemented";
      case 'move':
        console.log("MOVE");
        //let matchingActionObjects 
        var interpretation : DNFFormula = [[
          {polarity: true, relation: "ontop", args: ['a', "floor"]},
          {polarity: true, relation: "holding", args: ['a', 'b']}
        ]];

        break;
      default:
        throw "Not implemented";
    }

    return [];


  }

  function findObjectsInWorld(entity : Parser.Entity, state : WorldState) : string[]{

    let matchingObjects : string[] = [];
    let entityObject : Parser.Object;
    let objectsInWorld : string[] = Array.prototype.concat.apply([], state.stacks);

    entityObject = (entity.object.location) ? entity.object.object : entity.object;
    for (let key in state.objects){
      if(objectsInWorld.indexOf(key) == -1) continue;

      let objDef : ObjectDefinition = state.objects[key];
      let matched : boolean = true;

      console.log("State object " + key);
      console.log("Entity object " + entityObject.form);
      console.log("Entity size " + entityObject.size);
      console.log("Entity color " + entityObject.color);

      if (entityObject.form != "anyform" && entityObject.form != objDef.form){
        matched = false;
      }
      if (entityObject.size && entityObject.size != objDef.size){
        matched = false;
      }
      if (entityObject.color && entityObject.color != objDef.color){
        matched = false;
      }
      if (matched){
        matchingObjects.push(key);
      }
    }
    return matchingObjects;
  }
  /** A class that describes the goal objects */
  class goalObject{
    form : string;
    size : string;
    color : string;
    quantifier : string;
    location : Parser.Location;
  }
}
