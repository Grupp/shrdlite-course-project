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

    let objDefs : Parser.Object[];
    let entityObj : string[] = [];
    let locationObj : string[] = [];
    let relativeObj : string[] = [];
    let relation : string;
    let DNF : DNFFormula = [];

    // parse cmd
    switch (cmd.command){

      case 'take':
        console.log("TAKE");

        // find all objects in the world that matches the entity
        objDefs = getObjectDefinition(cmd, "entity");
        if (objDefs.length < 2){
          entityObj = findPossibleObjects(objDefs[0], state);
        } else {
          entityObj = findPossibleObjects(objDefs[0], state);
          relativeObj = findPossibleObjects(objDefs[1], state);
          // physical laws and stuff
        }
        for (let obj of entityObj){
          DNF.push([{polarity: true, relation: "holding", args: [obj]}]);
        }
        break;

      case 'put':
        console.log("PUT");
        throw "Not implemented";

      case 'move':
        console.log("MOVE");
        relation = cmd.location.relation;

        objDefs = getObjectDefinition(cmd, "entity");
        if (objDefs.length < 2){
          entityObj = findPossibleObjects(objDefs[0], state);
        } else {
          console.log("RELATIVE ENTITY");
          entityObj = findPossibleObjects(objDefs[0], state);
          relativeObj = findPossibleObjects(objDefs[1], state);
          entityObj = filterRelative(entityObj, relativeObj, relation, state);

        }

        objDefs = getObjectDefinition(cmd, "location");
        if (objDefs.length < 2){
          locationObj = findPossibleObjects(objDefs[0], state);

        } else {
          console.log("RELATIVE LOCATION");
          locationObj = findPossibleObjects(objDefs[0], state);
          relativeObj = findPossibleObjects(objDefs[1], state);
          locationObj = filterRelative(locationObj, relativeObj, relation, state);
        }


        console.log("Relation " + relation);
        console.log("Entity "  + entityObj);
        console.log("Location "  + locationObj);
        for(let lObj of locationObj){
          for (let eObj of entityObj){
            if(obeysPhysicalLaws(eObj, lObj, relation, state.objects)){
              DNF.push([{polarity: true, relation: relation , args: [eObj, lObj]}]);
            }
          }
        }
        break;

      default:
        throw "Not implemented";
      }
    if(DNF.length < 1) throw "No correct interpetations";
    return DNF;
  }

  function filterRelative(objA : string[], rObj : string[], relation :string, state : WorldState) :string[] {
    let obj : string[] = [];

    for(let o of objA){
      let matched : boolean = false;
      for (let r of rObj){
        if(matchSpatialRelations(o, r, relation, state)) matched = true;
      }
      if(matched) {
        obj.push(o);
      }
    }
    return obj;
  }


  function getObjectDefinition(cmd : Parser.Command, objType : string) : Parser.Object[] {

    let objectDefs : Object[] = [];
    let object: Parser.Object

    object = (objType === "entity") ? cmd.entity.object : cmd.location.entity.object;
    if (object.location){
        objectDefs.push(object.object);
        objectDefs.push(object.location.entity.object);
      } else {
        objectDefs.push(object);
    }
    return objectDefs;
  }


  function findPossibleObjects(objDef : Parser.Object, state : WorldState) : string[]{
    let possibleObjects : string[] = [];
    let objectsInWorld : string[] = Array.prototype.concat.apply([], state.stacks);

    if (objDef.form == "floor"){
      possibleObjects.push("floor");
      return possibleObjects;

    }
    for (let key in state.objects){
      // filter out objects that aren't in the current world
      if(objectsInWorld.indexOf(key) == -1) continue;

      let stateObjDef : ObjectDefinition = state.objects[key];
      let matched : boolean = true;

      // is the object matching anything in the world?
      if (objDef.form != "anyform" && objDef.form != stateObjDef.form) matched = false;
      if (objDef.size && objDef.size != stateObjDef.size) matched = false;
      if (objDef.color && objDef.color != stateObjDef.color) matched = false;

      if (matched){
        possibleObjects.push(key);
      }
    }

    return possibleObjects;
  }


  function findEntityObjects(entity : Parser.Entity, state : WorldState) : string[]{

    let matchingObjects : string[] = [];
    let entityObject : Parser.Object;
    let objectsInWorld : string[] = Array.prototype.concat.apply(["floor"], state.stacks);

    // is there an relative clause?
    entityObject = (entity.object.location) ? entity.object.object : entity.object;

    for (let key in state.objects){
      if(objectsInWorld.indexOf(key) == -1) continue;

      let objDef : ObjectDefinition = state.objects[key];
      let matched : boolean = true;

      // is the object matching anything in the world?
      if (entityObject.form != "anyform" && entityObject.form != objDef.form) matched = false;
      if (entityObject.size && entityObject.size != objDef.size) matched = false;
      if (entityObject.color && entityObject.color != objDef.color) matched = false;

      if (matched) matchingObjects.push(key);
    }
    return matchingObjects;
  }




  function obeysPhysicalLaws(objA : string, objB : string, relation : string, stateObjects : {[s:string] : ObjectDefinition}) : boolean{
    let obeys : boolean = true;

    if(relation == "above"){
      let objTemp = objA;
      objA = objB;
      objB = objTemp;
      relation = "under"
    }

    let objDefA : ObjectDefinition = stateObjects[objA];
    let objDefB : ObjectDefinition;

    // if floor add it as a object definition
    objDefB = (objB != "floor") ?  stateObjects[objB] : { "form":"floor",   "size":"null",  "color":"null"  };



    if(relation == "ontop" || relation == "inside"){
      // small objects cannot support large objects
      if(objDefA.size == "large" && objDefB.size == "small"){
        obeys = false;
      }
      // balls must be in boxes or on the floor
      if (objDefA.form == "ball" && (objDefB.form != "box" && objDefB.form != "floor")){
        obeys = false;
      }

      // boxes cannot contain pyramids, planks or boxes of the same size
      if(objDefA.form == "box" && objDefA.size == objDefB.size &&
        (objDefB.form == "pyramids" || objDefB.form == "plank" || objDefB.form == "box")){
        obeys = false;
      }

      // balls cannot support anything
      if(objDefB.form == "ball"){
        obeys = false;
      }

      //small boxes cannot be supported by small bricks or pyramids
      if(objDefA.form == "box" && objDefA.size == "small" &&
        (objDefB.form == "brick" || objDefB.form == "brick")){
        obeys = false;
      }
      //large boxes cannot be supported by large pyramids.
      if(objDefA.form == "box" && objDefA.size == "large" &&
        (objDefB.form == "pyramid" && objDefB.size == "large")){
        obeys = false;
      }
    }


    if (relation == "under"){
      //balls cannot support anyting
      if(objDefA.form == "ball"){
        obeys = false;
      }
    }
    // an object cannot relate to itself
    if(objA == objB){
      obeys = false;
    }
    /*
    The floor can support at most N objects (beside each other).  // planner
    All objects must be supported by something.                   // planner?
    The arm can only hold one object at the time.                 // planner?
    The arm can only pick up free objects.                        // planner?
    Objects are “inside” boxes, but “ontop” of other objects.     //planner
    [X] Balls must be in boxes or on the floor, otherwise they roll away.
    [X] Balls cannot support anything.
    [X] Small objects cannot support large objects.
    [X]Boxes cannot contain pyramids, planks or boxes of the same size.
    Small boxes cannot be supported by small bricks or pyramids.
    Large boxes cannot be supported by large pyramids.
    */
    return obeys;
  }

  function matchSpatialRelations(objA : string, objB : string, relation : string, state : WorldState) : boolean{
    let matched : boolean = true;

    let rowA : number;
    let rowB : number;
    let colA : number;
    let colB : number;

    for(let col in state.stacks){
      if(state.stacks[col].indexOf(objA) != -1){
        colA = +col;
        rowA = state.stacks[col].indexOf(objA);

        if( objB == "floor"){
          colB = +col;
          rowB = -1;
        }
      }
      if(state.stacks[col].indexOf(objB) != -1)
      {
        colB =  +col;
        rowB = state.stacks[col].indexOf(objB);
      }

    }
    if(relation == "inside"|| relation == "ontop"){
      //should be in same column and objA one above objB
      if(colA != colB || rowA -1 != rowB) matched = false;
    }

    if(relation == "above"){
      if(colA != colB || rowA <= rowB) matched = false;
    }

    if(relation == "under"){
      if(colA != colB || rowA >= rowB) matched = false;
    }

    if(relation == "beside"){
      if(colA == colB) matched = false;
    }

    if(relation == "leftof"){
      if(colA >= colB) matched = false;
    }

    if(relation == "rightof"){
      if(colA <= colB) matched = false;
    }
    return matched;
  }
}
