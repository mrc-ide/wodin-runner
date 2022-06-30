import {Simplex} from "dfoptim";

import { base } from "./base";
import type { OdinModelConstructable, Solution } from "./model";
import {interpolatedSolution, partialInterpolatedSolution, runModel} from "./model";
import type {UserType} from "./user";

export interface FitData {
    time: number[];
    value: number[];
}

export interface FitPars {
    base: UserType;
    vary: string[];
}

export function startFit(Model: OdinModelConstructable, data: FitData,
                         pars: FitPars, modelledSeries: string,
                         controlODE: any, controlFit: any) {
    const target = fitTarget(Model, data, pars, modelledSeries, controlODE);
    // TODO: require that we have starting points here (i.e., that
    // everything variable is in fact a number)
    const start = pars.vary.map((nm: string) => pars.base.get(nm) as number);
    return new Simplex(target, start, controlFit);
}

export function fitTarget(Model: OdinModelConstructable,
                          data: FitData, pars: FitPars,
                          modelledSeries: string,
                          control: any) {
    const tStart = data.time[0];
    const tEnd = data.time[data.time.length - 1];
    // TODO: it would be preferable if this error handling moved into
    // dfoptim, as it will be fairly common; could make it an option
    // for the control, which would be much nicer and easier to test.
    return (theta: number[]) => {
        const p = updatePars(pars, theta);
        const model = new Model(base, p, "error");
        const y0 = null;
        const solution =
            runModel(model, y0, tStart, tEnd, control).solution;

        const names = model.names();
        const idxModel = names.indexOf(modelledSeries);
        const yModel = solution(data.time).map((y) => y[idxModel]);
        const value = sumOfSquares(data.value, yModel);

        // We return a solution-type function just for the modelled
        // series as that's probably what the caller will
        // want. However, the full solution will be available too,
        // alongside the names.
        const solutionFit = partialInterpolatedSolution(
            solution, modelledSeries, idxModel, tStart, tEnd);
        const solutionAll = interpolatedSolution(
            solution, names, tStart, tEnd);

        return { data: {names, pars: p, solutionAll, solutionFit},
                 value };
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
