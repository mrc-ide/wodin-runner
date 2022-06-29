import * as dopri from "dopri";
import type { DopriControlParam } from "dopri";

import {base, BaseType} from "./base";

import {InternalStorage, UserType} from "./user";

/** Interpolated solution to the system of differential equations
 *
 *  @param t The time to look up the solution at
 */
export type Solution = (t: number) => number[];

/**
 * Constructor for an {@link OdinModel}
 *
 * @param base The singleton object {@link base}
 *
 * @param pars Parameters to pass to the model
 *
 * @param unusedUserAction String, describing the action to take if
 * there are unknown values in `pars` - possible values are "error",
 * "ignore", "warning" and "message"
 */
export type OdinModelConstructable =
    new(base: BaseType, pars: UserType, unusedUserAction: string) => OdinModel;

/**
 * The interface that odin ordinary differential equation (ODE) models
 * will match, though they will be generated in plain JavaScript and
 * not TypeScript.
 */
export interface OdinModelODE {
    /**  Set parameters into an existing model.
     *
     * @param pars New parameters for the model. Values are are
     * ommitted here but present in the model will be unchanged.
     *
     * @param unusedUserAction String, describing the action to take
     * if there are unknown values in `pars` - possible values are
     * "error", "ignore", "warning" and "message"
     */
    setUser(pars: UserType, unusedUserAction: string): void;

    /** Get initial conditions from the model
     * @param t The time to compute initial conditions at
     */
    initial(t: number): number[];

    /** Compute the derivatives
     *
     * @param t The time to compute initial conditions at
     *
     * @param y The value of the variables
     *
     * @param dydt An array *that will be written into*, will hold
     * derivatives on exit. Must be the same length as `y`
     */
    rhs(t: number, y: number[], dydt: number[]): void;

    /** Compute additional quantities that are derived from the
     * variables.  Unlike {@link rhs}, this returns a vector rather
     * than writing in place. Not all models include an `output`
     * method - these models have no output.
     *
     * @param t The time to compute output at
     *
     * @param y The value of the variables
     */
    output?(t: number, y: number[]): number[];

    /** Return a vector of names of variables */
    names(): string[];

    /**
     * Return the state of the internal storage - odin uses this for
     * debugging and testing.
     */
    getInternal(): InternalStorage;

    /**
     * Return metadata about the model - odin uses this internally.
     */
    getMetadata(): any;
}

/**
 * The interface that odin delay differential equation (DDE) models
 * will match, though they will be generated in plain JavaScript and
 * not TypeScript.
 */
export interface OdinModelDDE {
    /**  Set parameters into an existing model.
     *
     * @param pars New parameters for the model. Values are are
     * ommitted here but present in the model will be unchanged.
     *
     * @param unusedUserAction String, describing the action to take
     * if there are unknown values in `pars` - possible values are
     * "error", "ignore", "warning" and "message"
     */
    setUser(pars: UserType, unusedUserAction: string): void;

    /** Get initial conditions from the model
     * @param t The time to compute initial conditions at
     */
    initial(t: number): number[];

    /** Compute the derivatives
     *
     * @param t The time to compute initial conditions at
     *
     * @param y The value of the variables
     *
     * @param dydt An array *that will be written into*, will hold
     * derivatives on exit. Must be the same length as `y`
     *
     * @param solution The interpolated solution, which is used to
     * compute delayed versions of variables
     */
    rhs(t: number, y: number[], dydt: number[], solution: Solution): void;

    /** Compute additional quantities that are derived from the
     * variables.  Unlike {@link rhs}, this returns a vector rather
     * than writing in place. Not all models include an `output`
     * method - these models have no output.
     *
     * @param t The time to compute output at
     *
     * @param y The value of the variables
     *
     * @param solution The interpolated solution, which is used to
     * compute delayed versions of variables
     */
    output?(t: number, y: number[], solution: Solution): number[];

    /** Return a vector of names of variables */
    names(): string[];

    /**
     * Return the state of the internal storage - odin uses this for
     * debugging and testing.
     */
    getInternal(): InternalStorage;

    /**
     * Return metadata about the model - odin uses this internally.
     */
    getMetadata(): any;
}

export function isDDEModel(model: OdinModel): model is OdinModelDDE {
    return model.rhs.length === 4;
}

export function isODEModel(model: OdinModel): model is OdinModelODE {
    return model.rhs.length === 3;
}

/**
 * Union type representing supported odin models - currently this may
 * be an ordinary differential equation model ({@link OdinModelODE})
 * or a delay differential equation model ({@link
 * OdinModelDDE}). Later we will support discrete-time models here
 * too.
 */
export type OdinModel = OdinModelODE | OdinModelDDE;

export function runModel(model: OdinModel, y0: number[] | null,
                         tStart: number, tEnd: number,
                         control: Partial<DopriControlParam>) {
    return isDDEModel(model) ?
        runModelDDE(model as OdinModelDDE, y0, tStart, tEnd, control) :
        runModelODE(model as OdinModelODE, y0, tStart, tEnd, control);
}

function runModelODE(model: OdinModelODE, y0: number[] | null,
                     tStart: number, tEnd: number,
                     control: Partial<DopriControlParam>) {
    // tslint:disable-next-line:only-arrow-functions
    const rhs = function(t: number, y: number[], dydt: number[]) {
        model.rhs(t, y, dydt);
    };

    let output = null;
    if (typeof model.output === "function") {
        // Without 'as' here, TS thinks that model.output could be
        // rebound and no longer a function. We tried saving
        //   const output = model.output;
        // which pleases the compiler but then fails at runtime.
        // tslint:disable-next-line:ban-types
        output = (t: number, y: number[]) => (model.output as Function)(t, y);
    }

    if (y0 === null) {
        y0 = model.initial(tStart);
    }
    const solver = new dopri.Dopri(rhs, y0.length, control, output);
    solver.initialise(tStart, y0);
    return {solution: solver.run(tEnd),
            statistics: solver.statistics()};
}

function runModelDDE(model: OdinModelDDE, y0: number[] | null,
                     tStart: number, tEnd: number,
                     control: Partial<DopriControlParam>) {
    // tslint:disable-next-line:only-arrow-functions
    const rhs = function(t: number, y: number[], dydt: number[],
                         solution: Solution) {
        model.rhs(t, y, dydt, solution);
    };

    let output = null;
    if (typeof model.output === "function") {
        // As above for the ODE version
        output = (t: number, y: number[], solution: Solution) =>
            // tslint:disable-next-line:ban-types
            (model.output as Function)(t, y, solution);
    }

    if (y0 === null) {
        y0 = model.initial(tStart);
    }

    const internal = model.getInternal();
    internal.initial_t = tStart;

    const solver = new dopri.DDE(rhs, y0.length, control, output);
    solver.initialise(tStart, y0);
    return {solution: solver.run(tEnd),
            statistics: solver.statistics()};
}
