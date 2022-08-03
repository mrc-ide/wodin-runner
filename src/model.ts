import * as dopri from "dopri";
import type { DopriControlParam } from "dopri";

import { base, BaseType } from "./base";
import { interpolateCheckT } from "./interpolate";
import { InternalStorage, UserType } from "./user";
import { grid } from "./util";

/** Interpolated solution to the system of differential equations
 *
 *  @param t The time to look up the solution at
 */
export type Solution = (t: number) => number[];

/** Interpolated solution to the system of differential equations over
 * a set of times (vs a single time in {@link Solution})
 *
 *  @param t The time to look up the solution at
 */
export type FullSolution = (t: number[]) => number[][];

/**
 * We return a set of series from a few different places:
 *
 * * {@link wodinRun} returns the full set of series
 * * {@link wodinFit} returns a single series with just the fit data
 * * {@link batchRun} returns a number of full sets of series
 *
 * Later, when we get going with the stochastic interface, we'll need
 * a slightly more flexible interface perhaps because we'll have a
 * number of trajectories at once, and along with them summary
 * statistics such as the mean or median.
 *
 * Using some key-value mapping will likely end up being a bit
 * limiting eventually, because we have no easy place to store the
 * metadata that we'll want (these 5 traces all correspond to variable
 * 'x' with some parameter for example). So here, we'll use something
 * deliberately simple but easy to extend. It does not try to closely
 * match the plotly interface (wodin will take care of that instead).
 *
 * Later, we might want to swap the modelling of `y` for something
 * slightly more flexible (either using a multidimensional array or
 * allowing `y` to contain something more exotic per series).
 */
export interface SeriesSet {
    /** Names of elements in the series */
    names: string[];
    /** The domain that the series is available at, typically timea  */
    x: number[];
    /**
     * The values of traces; will have length `names.length` and each
     * element will have length `x.length`, so that `y[i][j]` is the
     * `j`th time point of the `i`th series
     */
    y: number[][];
}

/**
 * An interpolated solution to a system of differential equations,
 * typically created via {@link wodinRun}
 *
 * @param t0 Start time to return the solution (cannot be less than
 * the originally used `tStart` - we will increase it to `tStart` in
 * that case)
 *
 * @param t1 End time to return the solution (cannot be more than the
 * originally used `tEnd` - we will reduce it to `tEnd` in that case)
 *
 * @param nPoints Number of points to return - must be at least
 * one, and points will be evenly spaced between `t0` and `t1`
 */
export type InterpolatedSolution =
    (t0: number, t1: number, nPoints: number) => SeriesSet;

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

/** Common interface for all odin models */
export interface OdinModelBase {
    /**  Set parameters into an existing model.
     *
     * @param pars New parameters for the model. Values are are
     * omitted here but present in the model will be unchanged.
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
 * The interface that odin ordinary differential equation (ODE) models
 * will match, though they will be generated in plain JavaScript and
 * not TypeScript.
 */
export interface OdinModelODE extends OdinModelBase {
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
}

/**
 * The interface that odin delay differential equation (DDE) models
 * will match, though they will be generated in plain JavaScript and
 * not TypeScript.
 */
export interface OdinModelDDE extends OdinModelBase {
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
    const interpolateTimes = model.getMetadata().interpolateTimes;
    control.tcrit = interpolateCheckT(tStart, tEnd, interpolateTimes,
                                      control.tcrit);
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

/**
 * Conversion function for Dopri output into plotly input, allowing
 * efficient re-interpolation of subsets of the graph.
 *
 * @param solution The solution as returned from the solver
 *
 * @param names Vector of names for the traces
 *
 * @param tStart Starting time for the integration
 *
 * @param tEnd End time for the integration
 */
export function interpolatedSolution(solution: FullSolution,
                                     names: string[],
                                     tStart: number,
                                     tEnd: number): InterpolatedSolution {
    return (t0: number, t1: number, nPoints: number): SeriesSet => {
        const t = grid(Math.max(tStart, t0), Math.min(tEnd, t1), nPoints);
        const values = solution(t);
        // this is basically a transpose, pulling out every series in
        // turn
        const y = values[0].map(
            (_: any, i: number) => values.map((row: number[]) => row[i]));
        return { names, x: t, y };
    };
}
