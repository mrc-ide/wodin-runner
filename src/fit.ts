import { base } from "./base";
import type { OdinModelConstructable, Solution } from "./model";
import {interpolatedSolution, partialInterpolatedSolution, runModel} from "./model";
import type {UserType} from "./user";

/** Interface for data to fit an odin model to; every data set has two
 *  series, even if they are derived from some larger data set.
 */
export interface FitData {
    /** Array of time values; must be increasing */
    time: number[];
    /** Observed data to fit to; must be the same length as `time` */
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

export function fitTarget(Model: OdinModelConstructable,
                          data: FitData, pars: FitPars,
                          modelledSeries: string,
                          control: any) {
    const tStart = data.time[0];
    const tEnd = data.time[data.time.length - 1];
    return (theta: number[]) => {
        const p = updatePars(pars, theta);
        const model = new Model(base, p, "error");
        const y0 = null;
        const solution = runModel(model, y0, tStart, tEnd, control).solution;
        const names = model.names();
        const idxModel = names.indexOf(modelledSeries);
        const yModel = solution(data.time).map((y) => y[idxModel]);

        // Unfortunately, TypeDoc does not copy all doc comments here
        // over, so I've not documented them here.
        return {
            /** Additional data alongside the goodness of fit, see above */
            data: {
                names,
                pars: p,
                solutionAll: interpolatedSolution(
                    solution, names, tStart, tEnd),
                solutionFit: partialInterpolatedSolution(
                    solution, modelledSeries, idxModel, tStart, tEnd),
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
        tot += (x[i] - y[i]) ** 2;
    }
    return tot;
}
