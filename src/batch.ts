import type { DopriControlParam } from "dopri";

import type { OdinModelConstructable } from "./model";
import { InterpolatedSolution, SeriesSet, SeriesSetValues, TimeMode, Times } from "./solution";
import { UserType } from "./user";
import { grid, gridLog, loop, unique, whichMax, whichMin } from "./util";
import { wodinRun } from "./wodin";

export type singleBatchRun = (pars: UserType, tStart: number, tEnd: number) => InterpolatedSolution;

export class Batch {
    /** The parameters used for this batch run */
    public readonly pars: BatchPars;

    /** The start time of the solution */
    public readonly tStart: number;

    /** The end time of the solution */
    public readonly tEnd: number;

    /** An array of solutions */
    public readonly solutions: InterpolatedSolution[];

    /** An array of errors */
    public readonly errors: BatchError[];

    private _extremes?: Extremes<SeriesSet>;
    private _pending: number[];
    private readonly _run: singleBatchRun;

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
        // Start with an empty BatchPars object, we'll re-add values
        // as they are successfully computed later.
        this.pars = { ...pars, values: [] as number[]};
        this.tStart = tStart;
        this.tEnd = tEnd;
        this.solutions = [];
        this.errors = [];
        this._pending = pars.values;
        this._run = run;
    }

    /**
     * Compute the next parameter set in the batch. If all have been
     * computed, the method will return very quickly but not error.
     *
     * @return `true` if all parameter sets have been computed,
     * `false` otherwise.
     */
    public compute(): boolean {
        if (this._pending.length > 0) {
            const value = this._pending[0];
            this._pending = this._pending.slice(1);
            const p = updatePars(this.pars.base, this.pars.name, value);
            try {
                this.solutions.push(this._run(p, this.tStart, this.tEnd));
                this.pars.values.push(value);
            } catch (e: any) {
                this.errors.push({ value, error: (e as Error).message });
            }
        }
        const isComplete = this._pending.length === 0;
        if (isComplete && this.solutions.length === 0) {
            throw Error(`All solutions failed; first error: ${this.errors[0].error}`);
        }
        return isComplete;
    }

    /**
     * Convenience function for computing all parameter sets in one
     * blocking loop.
     */
    public run(): void {
        while (!this.compute()) {
            // tslint:disable-next-line:no-empty
        }
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
            (s: InterpolatedSolution) => s({ mode: TimeMode.Given, times: [time] }));
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

    // plan - rewrite this in terms of free functions that take the
    // different types, then we go through and rewrite things so that
    // we can test the specific cases in dust. The issue to hit is
    // that with some cases we might have a deterministic series 0 but
    // nondeterministic later, and that will require care, but just
    // happened to work before because we guaranteed a single trace.
    private findExtremes() {
        if (this._extremes === undefined) {
            this._extremes = computeExtremes(this.tStart, this.tEnd, this.pars.values, this.solutions);
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
 *
 * @param immediate Indicates if we should immediately compute all
 * solutions in the batch (may take a while).
 */
export function batchRun(Model: OdinModelConstructable, pars: BatchPars,
                         tStart: number, tEnd: number,
                         control: Partial<DopriControlParam>,
                         immediate: boolean = true): Batch {
    const run = (p: UserType, t0: number, t1: number) =>
        wodinRun(Model, p, t0, t1, control);
    const ret = new Batch(run, pars, tStart, tEnd);
    if (immediate) {
        ret.run();
    }
    return ret;
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

export function updatePars(base: UserType, name: string, value: number): UserType {
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

export function computeExtremes(tStart: number, tEnd: number, x: number[],
                                solutions: InterpolatedSolution[]): Extremes<SeriesSet> {
    const n = 501;
    const times = {
        mode: TimeMode.Grid,
        nPoints: n,
        tEnd: tEnd,
        tStart: tStart,
    } as const;
    const result = solutions.map((s: InterpolatedSolution) => s(times));
    return computeExtremesResult(x, result);
}

function findExtremes(t: number[], y: number[]): Extremes<number> {
    const idxMin = whichMin(y);
    const idxMax = whichMax(y);
    const tMin = t[idxMin];
    const tMax = t[idxMax];
    const yMin = y[idxMin];
    const yMax = y[idxMax];
    return {tMax, tMin, yMax, yMin};
}

export function computeExtremesResult(x: number[], result: SeriesSet[]): Extremes<SeriesSet> {
    const times = result[0].x;

    const newSeriesSet = () => ({ x, values: [] });
    const ret: Extremes<SeriesSet> = {
        yMin: newSeriesSet(), yMax: newSeriesSet(), tMin: newSeriesSet(), tMax: newSeriesSet()
    };

    const names = unique(result[0].values.map((s) => s.name));
    for (let nm of names) {
        const s = repairDeterministic(result.map((r) => r.values.filter((el) => el.name === nm)));
        const len = s[0].length;
        for (let idx = 0; idx < len; ++idx) {
            const extremes = s.map((el) => findExtremes(times, el[idx].y));
            Object.keys(ret).forEach((k) => {
                const key = k as keyof typeof ret;
                ret[key].values.push({...s[0][idx], y: extremes.map((el) => el[key])});
            });
        }
    }

    return ret;
}

function repairDeterministic(result: SeriesSetValues[][]): SeriesSetValues[][] {
    const len = result.map((el) => el.length);
    // We should be ok here, but probably worth checking that:
    //
    // only 1 or 2 lengths
    // that there are only 1 or two distinct set of descriptions
    // that description is non-empty
    if ((new Set(len)).size !== 1) {
        const n = Math.max(...len);
        const description = result[len.indexOf(n)].map((el) => el.description as string);
        for (let i = 0; i < result.length; ++i) {
            if (result[i].length === 1) {
                result[i] = description.map((desc: string) => ({ ...result[i][0], description: desc }));
            }
        }
    }
    return result;
}
