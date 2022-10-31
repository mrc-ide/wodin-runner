import type { DopriControlParam } from "dopri";

import type { OdinModelConstructable } from "./model";
import { SeriesSet, TimeMode, Times } from "./solution";
import { UserType } from "./user";
import { grid, gridLog, loop, whichMax, whichMin } from "./util";
import { wodinRun } from "./wodin";

export type BatchSolution = (times: Times) => SeriesSet;
export type singleBatchRun = (pars: UserType, tStart: number, tEnd: number) => BatchSolution;

export class Batch {
    /** The parameters used for this batch run */
    public readonly pars: BatchPars;

    /** The start time of the solution */
    public readonly tStart: number;

    /** The end time of the solution */
    public readonly tEnd: number;

    /** An array of solutions */
    public readonly solutions: BatchSolution[];

    /** An array of errors */
    public readonly errors: BatchError[];

    private _extremes?: Extremes<SeriesSet>;

    /** Construct a batch run, which will run the model many times
     *
     * @param Model The model constructor
     *
     * @param pars Parameters of the model, and information about the
     * one to vary. Most easily generated with {@link batchParsRange}
     * or {@link batchParsDisplace}.
     *
     * @param tStart Start of the integration (often 0)
     *
     * @param tEnd End of the integration (must be greater than `tStart`)
     *
     * @param control Optional control parameters to tune the integration
     */
    constructor(run: singleBatchRun, pars: BatchPars, tStart: number, tEnd: number) {
        this.pars = pars;
        this.tStart = tStart;
        this.tEnd = tEnd;

        const solutions = [] as typeof this.solutions;
        const errors = [] as typeof this.errors;
        const values = [] as number[];

        pars.values.forEach((v: number) => {
            const p = updatePars(pars.base, pars.name, v);
            try {
                solutions.push(run(p, tStart, tEnd));
                values.push(v);
            } catch (e: any) {
                errors.push({value: v, error: (e as Error).message});
            }
        });

        // We need to think about this error, though it should not
        // come out that often...
        if (solutions.length === 0) {
            throw Error(`All solutions failed; first error: ${errors[0].error}`);
        }

        // We actually only use the value here, so could just save
        // that, and not the rest, really.
        this.pars = {...pars, values};
        this.solutions = solutions;
        this.errors = errors;
    }

    /**
     * Compute an the value of each series at a particular point in
     * the solution
     *
     * @param time The time; you can use -Infinity and Infinity to
     * represent the beginning and end of the solution
     */
    public valueAtTime(time: number): SeriesSet {
        const result = this.solutions.map(
            (s) => s({ mode: TimeMode.Given, times: [time] }));
        const x = this.pars.values;
        const extractSeries = (idx: number) => ({
            name: result[0].values[idx].name,
            y: result.map((r) => r.values[idx].y[0]),
        });
        const values = result[0].values.map((_: any, idx: number) => extractSeries(idx));
        return { values, x };
    }

    /**
     * Return one of the extremes
     *
     * @param name The name of the extreme to look up; one of
     *   * "yMin": The minimum value of each series
     *   * "yMax": The maximum value of each series
     *   * "tMin": The time that each series reached its minimum
     *   * "tMax": The time that each series reached its maximum
     */
    public extreme(name: keyof Extremes<SeriesSet>): SeriesSet {
        return this.findExtremes()[name];
    }

    private findExtremes() {
        if (this._extremes === undefined) {
            // Later we'll polish these off with a 1d optimiser from
            // ~50 points which will be likely faster and more
            // accurate; that depends on a 1d optimiser added to
            // dfoptim, then some additional work in findExtremes
            // (which will need to accept the solution object too).
            const n = 501;
            const times = {
                mode: TimeMode.Grid,
                nPoints: n,
                tEnd: this.tEnd,
                tStart: this.tStart,
            } as const;
            const result = this.solutions.map((s) => s(times));
            const t = result[0].x;
            const names = result[0].values.map((s) => s.name);
            const extremes = loop(names.length, (idx: number) =>
                                  result.map((s) => findExtremes(t, s.values[idx].y)));
            const x = this.pars.values;
            this._extremes = {
                tMax: extractExtremes("tMax", names, x, extremes),
                tMin: extractExtremes("tMin", names, x, extremes),
                yMax: extractExtremes("yMax", names, x, extremes),
                yMin: extractExtremes("yMin", names, x, extremes),
            };
        }
        return this._extremes;
    }
}

/**
 * A set of parameters to run in a group, say for a sensitivity
 * analysis. Consists of a base set of parameters and a single
 * parameter that takes a range of values.
 */
export interface BatchPars {
    /** The base set of parameters */
    base: UserType;
    /** The name of the parameter to vary */
    name: string;
    /** The values that `name` will take, replacing the value in `base` */
    values: number[];
}

export interface BatchError {
    /** The failed parameter value */
    value: number;
    /** The error */
    error: string;
}

/**
 * Run a series of runs of an ODE model, returning a set of solutions.
 *
 * @param Model The model constructor
 *
 * @param pars Parameters of the model, and information about the one
 * to vary. Most easily generated with {@link batchParsRange} or
 * {@link batchParsDisplace}.
 *
 * @param tStart Start of the integration (often 0)
 *
 * @param tEnd End of the integration (must be greater than `tStart`)
 *
 * @param control Optional control parameters to tune the integration
 */
export function batchRun(Model: OdinModelConstructable, pars: BatchPars,
                         tStart: number, tEnd: number,
                         control: Partial<DopriControlParam>) {
    const run = (p: UserType, t0: number, t1: number) =>
        wodinRun(Model, p, t0, t1, control);
    return new Batch(run, pars, tStart, tEnd);
}

/** Generate a set of parameters suitable to pass through to {@link
 * batchRun}, evenly spaced between `min` and `max`.
 *
 * @param base The base set of parameters
 *
 * @param name Name of the parameter to change
 *
 * @param count The number of integrations to run
 *
 * @param logarithmic If `true`, the points are spaced on a
 * logarithmic scale rather than arithmetic.
 *
 * @param min Lower bound of the range, must be at most the same as
 * the current value of `name` witin `base`
 *
 * @param max Upper bound of the range, must be at least the same as
 * the current value of `name` witin `base`
 */
export function batchParsRange(base: UserType, name: string, count: number,
                               logarithmic: boolean,
                               min: number, max: number): BatchPars {
    const value = getParameterValueAsNumber(base, name);
    if (min > value) {
        throw Error(`Expected lower bound to be no greater than ${value}`);
    }
    if (max < value) {
        throw Error(`Expected upper bound to be no less than ${value}`);
    }
    if (min >= max) {
        throw Error("Expected upper bound to be greater than lower bound");
    }
    if (count < 2) {
        throw Error("Must include at least 2 traces in the batch");
    }
    if (logarithmic && min <= 0) {
        throw Error("Lower bound must be greater than 0 for logarithmic scale");
    }
    const values = logarithmic ?
        gridLog(min, max, count) : grid(min, max, count);
    return {base, name, values};
}

/**
 * @param base The base set of parameters
 *
 * @param name Name of the parameter to change
 *
 * @param count The number of simulations to run
 *
 * @param logarithmic If `true`, the points are spaced on a
 * logarithmic scale rather than arithmetic.
 *
 * @param displace The *percentage* amount to displace the current
 * value of the parameter `name` (so a value of 15 creates values
 * ranging from 15% below to 15% above the current value).
 */
export function batchParsDisplace(base: UserType, name: string, count: number,
                                  logarithmic: boolean,
                                  displace: number): BatchPars {
    const value = getParameterValueAsNumber(base, name);
    const delta = displace / 100;
    const min = value * (1 - delta);
    const max = value * (1 + delta);
    return batchParsRange(base, name, count, logarithmic, min, max);
}

export function updatePars(base: UserType, name: string, value: number) {
    const ret = { ...base };
    ret[name] = value;
    return ret;
}

function getParameterValueAsNumber(pars: UserType, name: string): number {
    const value = pars[name];
    if (value === undefined) {
        throw Error(`Expected a value for '${name}'`);
    }
    if (typeof value !== "number") {
        throw Error(`Expected a number for '${name}'`);
    }
    return value;
}

/**
 * Collection of extreme values; this is a templated type
 */
export interface Extremes<T> {
    /** The time that a series reached its minimum */
    tMin: T;
    /** The time that a series reached its maximum */
    tMax: T;
    /** The minimum value of a series */
    yMin: T;
    /** The maximum value of a series */
    yMax: T;
}

// Later, we might do some polishing of these, which should make it
// both faster and more accurate, but we'll need to pass in the
// correct interpolating function too.
function findExtremes(t: number[], y: number[]): Extremes<number> {
    const idxMin = whichMin(y);
    const idxMax = whichMax(y);
    const tMin = t[idxMin];
    const tMax = t[idxMax];
    const yMin = y[idxMin];
    const yMax = y[idxMax];
    return {tMax, tMin, yMax, yMin};
}

function extractExtremes(name: keyof Extremes<number>,
                         names: string[],
                         x: number[],
                         extremes: Array<Array<Extremes<number>>>): SeriesSet {
    const values = loop(names.length, (idx) =>
                        ({name: names[idx], y: extremes[idx].map((el) => el[name])}));
    return { x, values };
}
