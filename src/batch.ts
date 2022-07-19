import type { DopriControlParam } from "dopri";

import type { InterpolatedSolution, OdinModelConstructable, Series } from "./model";
import { UserType } from "./user";
import { grid, gridLog } from "./util";
import { wodinRun } from "./wodin";

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
    return pars.values.map((v: number) => {
        const p = updatePars(pars.base, pars.name, v);
        return wodinRun(Model, p, tStart, tEnd, control);
    });
}

/** Generate a set of parameters suitable to pass through to {@link
 * batchRun}, evenly spaced between `min` and `max`.
 *
 * @param base The base set of parameters
 *
 * @param name Name of the parameter to change
 *
 * @param count The number of traces to run
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
 * @param count The number of traces to run
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

export class BatchResult {
    public readonly pars: BatchPars;
    public readonly solution: InterpolatedSolution[];

    constructor(pars: BatchPars, solution: InterpolatedSolution[]) {
        this.pars = pars;
        this.solution = solution;
    }

    public valueAtTime(time: number): Series[] {
        const y = this.solution.map(
            (s: InterpolatedSolution) => s(time, time, 1));
        return y[0].map((_: any, idxSeries: number) => ({
            name: y[0][idxSeries].name,
            x: this.pars.values,
            y: y.map((s: Series[]) => s[idxSeries].y[0]),
        }));
    }
}
