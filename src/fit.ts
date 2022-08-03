import type { Result } from "dfoptim";

import { base } from "./base";
import type { OdinModelConstructable, Solution } from "./model";
import {
    interpolatedSolution,
    InterpolatedSolution,
    runModel,
} from "./model";
import type {UserType} from "./user";

/** Interface for data to fit an odin model to; every data set has two
 *  series, even if they are derived from some larger data set.
 */
export interface FitData {
    /** Array of time values; must be increasing */
    time: number[];
    /** Observed data to fit to; must be the same length as
     * `time`. Missing values (`NaN`) are allowed, and are ignored in
     * the fit.
     */
    value: number[];
}

/** Interface to control parameters of a fit. A model will have some
 *  number of parameters but only some change. We also need to provide
 *  starting points for the fit.
 */
export interface FitPars {
    /** Base parameters; used as starting points for those that change
     * (within `vary`) and fixed values for those that don't change
     */
    base: UserType;
    /** Array of names of parameters that should be optimised during
     * the fitting process. All values in `vary` must be present as
     * keys in `base`.
     */
    vary: string[];
}

/**
 * Result of fitting a model, returned by the `result` method on
 * `Simplex` after initialisation with {@link wodinFit}. Also returned
 * by {@link wodinFitBaseline}.
 */
export interface FitResult extends Result {
    data: {
        /** The names of all traces returned by the model */
        names: string[];
        /** The full model parameters, as a Map (i.e., suitable to
         *   pass back into an {@link OdinModelConstructable} object or {@link
         *   wodinRun})
         */
        pars: UserType;
        /** The solution of all series; an interpolating
         *   function as as would be returned by {@link wodinRun}
         */
        solution: InterpolatedSolution;
    };
    /** The sum of squares for this set of parameters */
    value: number;
}

export function fitTarget(Model: OdinModelConstructable,
                          data: FitData, pars: FitPars,
                          modelledSeries: string,
                          control: any) {
    const tStart = data.time[0];
    const tEnd = data.time[data.time.length - 1];
    return (theta: number[]): FitResult => {
        const p = updatePars(pars, theta);
        const model = new Model(base, p, "error");
        const y0 = null;
        const solution = runModel(model, y0, tStart, tEnd, control).solution;
        const names = model.names();
        const idxModel = names.indexOf(modelledSeries);
        const yModel = solution(data.time).map((y) => y[idxModel]);

        return {
            /** Additional data alongside the goodness of fit, see above */
            data: {
                names,
                pars: p,
                solution: interpolatedSolution(
                    solution, names, tStart, tEnd),
            },
            /** Goodness of fit, the sum-of-squared differences
             * between the observed data and the modelled series
             */
            value: sumOfSquares(data.value, yModel),
        };
    };
}

export function updatePars(pars: FitPars, theta: number[]) {
    const ret = new Map(pars.base);
    for (let i = 0; i < pars.vary.length; ++i) {
        ret.set(pars.vary[i], theta[i]);
    }
    return ret;
}

export function sumOfSquares(x: number[], y: number[]) {
    let tot = 0;
    for (let i = 0; i < x.length; ++i) {
        const xi = x[i];
        if (!isNaN(xi)) {
            tot += (xi - y[i]) ** 2;
        }
    }
    return tot;
}
