import type { DopriControlParam } from "dopri";

import type { OdinModelConstructable } from "./model";
import { InterpolatedSolution, SeriesSet, SeriesSetValues, TimeMode, Times } from "./solution";
import { UserType } from "./user";
import { grid, gridLog, sameArrayContents, unique, whichMax, whichMin } from "./util";
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
        return valueAtTime(time, this.pars.values, this.solutions);
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
            const extremes = computeExtremes(this.tStart, this.tEnd, this.pars.values, this.solutions);
            if (this._pending.length !== 0) {
                return extremes;
            }
            this._extremes = extremes;
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

function valueAtTime(time: number, x: number[], solutions: InterpolatedSolution[]): SeriesSet {
    // Note that here we get a length-1 array for each series
    const result = solutions.map(
        (s: InterpolatedSolution) => s({ mode: TimeMode.Given, times: [time] }));
    return valueAtTimeResult(x, result);
}

// Create a SeriesSet with the domain being parameters that we
// iterated over.
//
// In the simple case where we have an ODE model or a single summary
// statistic, there will be one series per variable in the series
// set. Where mutiple summaries are present, there will be one per
// name/description combination.
//
// For stochastic models with multiple summaries, each SeriesSet will
// have up to nVariables * nSummaries differen traces in it,
// distinguished by their "name" and "description" properties within
// each element of a SeriesSet. We want to comute the extremes for
// each name/description combination and return a single SeriesSet
// from this.
//
// There's a complication where we have deterministic traces mixed in
// with more than one stochastic summaries; se below for details.
export function valueAtTimeResult(x: number[], result: SeriesSet[]): SeriesSet {
    const ret: SeriesSet = { x, values: [] };
    const names = unique(result[0].values.map((s) => s.name));
    // First, loop over each distinct variable (e.g., S, I, R)
    for (const nm of names) {
        // Make sure that all "description" fields, where present, are
        // aligned consistently for this variable; see below for
        // details.
        const s = alignDescriptions(result.map((r) => r.values.filter((el) => el.name === nm)));
        // Then loop over each summary, differentiated by the
        // description field, for this variable (e.g. S Mean, S Min, S
        // Max). For ODE models "len" is always 1.
        const len = s[0].length;
        for (let idx = 0; idx < len; ++idx) {
            // We need to get the 0'th element here because the
            // interpolated function always returns an array (see
            // valueAtTime). Apply this collected set of y values
            // against the metadata (name and description) from the
            // first found series.
            const y = s.map((el) => el[idx].y[0]);
            ret.values.push({...s[0][idx], y });
        }
    }
    return ret;
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

// TODO: It's possible that for the discrete time models we should do
// this differently. I think allowing customisation of the number of
// points here would be sensible, as then we can look this up more
// accurately for dust.
function computeExtremes(tStart: number, tEnd: number, x: number[],
                         solutions: InterpolatedSolution[]): Extremes<SeriesSet> {
    const n = 501;
    const times = {
        mode: TimeMode.Grid,
        nPoints: n,
        tEnd,
        tStart,
    } as const;
    const result = solutions.map((s: InterpolatedSolution) => s(times));
    return computeExtremesResult(x, result);
}

// The same pattern as valueAtTimeResult, but complicated by the
// additional "dimension" of extreme (we end up with four things we're
// trying to keep track of, rather than just one).
export function computeExtremesResult(x: number[], result: SeriesSet[]): Extremes<SeriesSet> {
    const newSeriesSet = () => ({ x: [...x], values: [] });
    const ret: Extremes<SeriesSet> = {
        tMax: newSeriesSet(), tMin: newSeriesSet(), yMax: newSeriesSet(), yMin: newSeriesSet(),
    };
    if (x.length === 0) {
        return ret;
    }

    const times = result[0].x;
    const names = unique(result[0].values.map((s) => s.name));
    for (const nm of names) {
        const s = alignDescriptions(result.map((r) => r.values.filter((el) => el.name === nm)));
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

function findExtremes(t: number[], y: number[]): Extremes<number> {
    const idxMin = whichMin(y);
    const idxMax = whichMax(y);
    const tMin = t[idxMin];
    const tMax = t[idxMax];
    const yMin = y[idxMin];
    const yMax = y[idxMax];
    return {tMax, tMin, yMax, yMin};
}

// Make sure that the "description" fields are consistent within each
// variable across a set of SeriesSetValues (i.e., an array of the
// "values" field of a set of SeriesSets, typically over a range of
// parameters).
//
// We'll be given an array-of-arrays corresponding to the
// SeriesSetValues for a *single variable* (they are filtered to this
// before passing here); result[i][j] is the i'th parameter set and
// j'th version of that variable's trace within this parameter
// set. For ODE models, and for stochastic models where there is only
// a single summary the second dimension will always be length 1.
//
// In the case supported by odin-js itself this function is the
// identity function, passing "result" back unmodified. This is
// because with ODE models there will always be a single trace per
// variable within a SeriesSet, with no "description" field present,
// so there is no alignment needed.
//
// In dust models where the simulation was run with multiple summary
// statistics, the second dimension will have length of more than
// 1. However, in the case where a trace was stochastic only a single
// deterministic trace will be returned.  That's fine if this trace is
// deterministic over all parameter sets, but in the case where some
// parameter sets return a single deterministic trace we want to
// replicate the deterministic trace to the same length as the
// stochastic ones and copy over the description fields from the
// stochastic traces.
//
// So given input as
//
//   [[aMean, aMin, aMax], [bDeterministic], [cMean, cMin, cMax]]
//
// We want to return
//
//   [[aMean, aMin, aMax], [bMean*, bMin*, bMax*], [cMean, cMin, cMax]]
//
// where all the "b" serieses have the same y as bDeterminstic but the
// descriptions Mean, Min and Max following the "a" and "c" series.
//
// The function alignDescriptionsGetLevels works out what this array
// of description values should be, and double-checks that the
// serieses are alignable.
function alignDescriptions(result: SeriesSetValues[][]): SeriesSetValues[][] {
    const len = result.map((el) => el.length);
    if (len.every((el) => el === 1)) {
        return result;
    }
    const n = Math.max(...len);
    const description = alignDescriptionsGetLevels(result);
    for (let i = 0; i < result.length; ++i) {
        if (result[i].length === 1) {
            result[i] = description.map((desc: string) => ({ ...result[i][0], description: desc }));
        }
    }
    return result;
}

// Check that in our array-of-arrays of series values (see above) that
// the "description" fields are alignable. That means:
//
// * if we all series sets have "description" fields, then these are
//   the same values in the same order for every set.
// * if we have more than one series for a variable then every series
//   has a defined description
// * in the case where some series only have a single entry, that all
//   serieses that only have single entry have the same entry
//
// We return the array of description values - because of the early
// exit condition in alignDescriptions this will always have length
// greater than one.
export function alignDescriptionsGetLevels(result: SeriesSetValues[][]): string[] {
    let descriptionSingle: string | undefined | null = null;
    let description: string[] = [];
    result.forEach((r) => {
        if (r.length === 1) {
            const d = r[0].description;
            if (descriptionSingle === null) {
                descriptionSingle = d;
            } else if (d !== descriptionSingle) {
                throw Error(`Unexpected inconsistent descriptions: have ${descriptionSingle}, but given ${d}`);
            }
        } else {
            const d = r.map((el) => el.description);
            if (description.length === 0) {
                if (d.some((el) => el === undefined)) {
                    throw Error("Expected all descriptions to be defined");
                }
                description = d as string[]; // safe because of previous check
            } else if (!sameArrayContents(d, description)) {
                throw Error(`Unexpected inconsistent descriptions: have [${description.join(", ")}], but given [${d.join(", ")}]`);
            }
        }
    });

    return description;
}
