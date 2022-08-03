import type { DopriControlParam } from "dopri";

import type {
    InterpolatedSolution,
    OdinModelConstructable,
    SeriesSet,
} from "./model";
import { UserType } from "./user";
import { grid, gridLog, loop, whichMax, whichMin } from "./util";
import { wodinRun } from "./wodin";

export class Batch {
    /** The parameters used for this batch run */
    public readonly pars: BatchPars;

    /** The start time of the solution */
    public readonly tStart: number;

    /** The end time of the solution */
    public readonly tEnd: number;

    /** An array of solutions */
    public readonly solutions: InterpolatedSolution[];

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
    constructor(Model: OdinModelConstructable, pars: BatchPars,
                tStart: number, tEnd: number,
                control: Partial<DopriControlParam>) {
        this.pars = pars;
        this.tStart = tStart;
        this.tEnd = tEnd;
        this.solutions = pars.values.map((v: number) => {
            const p = updatePars(pars.base, pars.name, v);
            return wodinRun(Model, p, tStart, tEnd, control);
        });
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
            (s: InterpolatedSolution) => s(time, time, 1));
        const names = result[0].names;
        const x = this.pars.values;
        const y = result[0].names.map((_: any, idxSeries: number) =>
                                      result.map((r: SeriesSet) => r.y[idxSeries][0]));
        return {names, x, y};
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
            const result = this.solutions.map(
                (s: InterpolatedSolution) => s(this.tStart, this.tEnd, n));
            const names = result[0].names;
            const x = this.pars.values;

            const extremes = loop(
                names.length, (idxSeries: number) =>
                    result.map((s: SeriesSet) => findExtremes(idxSeries, s)));

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
    return new Batch(Model, pars, tStart, tEnd, control);
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
    const ret = new Map(base);
    ret.set(name, value);
    return ret;
}

function getParameterValueAsNumber(pars: UserType, name: string): number {
    const value = pars.get(name);
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
function findExtremes(idxSeries: number, s: SeriesSet): Extremes<number> {
    const t = s.x;
    const y = s.y[idxSeries];
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
    const y = loop(names.length, (i: number) => extremes[i].map((el: Extremes<number>) => el[name]));
    return { names, x, y };
}
