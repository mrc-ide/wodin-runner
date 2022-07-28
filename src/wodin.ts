import { Simplex, SimplexControlParam } from "dfoptim";
import type { DopriControlParam } from "dopri";

import { base } from "./base";
import { FitData, FitPars, fitTarget } from "./fit";
import type { OdinModelConstructable, Solution } from "./model";
import { interpolatedSolution, runModel } from "./model";
import type { UserType } from "./user";

/** The "run" method for wodin; this runs the model and returns a
 * closure that will provide data in a useful format to provide to
 * plotly.
 *
 * @param Model The model constructor
 *
 * @param pars Parameters to set into the model on construction
 *
 * @param tStart Start of the integration (often 0)
 *
 * @param tEnd End of the integration (must be greater than `tStart`)
 *
 * @param control Optional control parameters to tune the integration
 */
export function wodinRun(Model: OdinModelConstructable, pars: UserType,
                         tStart: number, tEnd: number,
                         control: Partial<DopriControlParam>) {
    const model = new Model(base, pars, "error");
    const y0 = null;
    const solution = runModel(model, y0, tStart, tEnd, control).solution;
    const names = model.names();
    return interpolatedSolution(solution, names, tStart, tEnd);
}

/** Begin a fit. This will evaluate the model `pars.vary.length + 1`
 * times, and then return a
 * [`dfoptim.Simplex`](https://reside-ic.github.io/dfoptim/classes/Simplex.html)
 * object. You can then call `.run()` to fit the model in one go
 * (could block for a long time) or repeatedly call `.step()` until it
 * returns `true` when it has converged.
 *
 * The `data` field of the returned value, both during a run via
 * `.result()` and on convergence (perhaps via `.run()`) will have
 * interpolated solutions available via an object containing:
 *
 * * `names`: the names of all traces returned by the model
 * * `pars`: The full model parameters, as a Map (i.e., suitable to
 *   pass back into an {@link OdinModelConstructable} object or {@link
 *   wodinRun})
 * * `solutionAll`: The solution of all series; an interpolating
 *   function as as would be returned by {@link wodinRun}
 * * `solutionFit`: The solution to a just the modelled series being
 *    fit, as a single trace
 *
 * See {@link FitResult}
 *
 * @param Model The model constructor
 *
 * @param data The data to fit to; there will be one time and one data
 * series within this
 *
 * @param pars Information about the parameters; which are to be
 * varied, which to be fixed, and their starting values
 *
 * @param modelledSeries Name of the series of data produced by the
 * model that should be compared with the data.
 *
 * @param controlODE Control parameters to tune the integration
 *
 * @param controlFit Control parameters to tune the optimisation
 *
 */
export function wodinFit(Model: OdinModelConstructable, data: FitData,
                         pars: FitPars, modelledSeries: string,
                         controlODE: Partial<DopriControlParam>,
                         controlFit: Partial<SimplexControlParam>) {
    const target = fitTarget(Model, data, pars, modelledSeries, controlODE);
    // TODO: require that we have starting points here (i.e., that
    // everything variable is in fact a number)
    const start = pars.vary.map((nm: string) => pars.base.get(nm) as number);
    return new Simplex(target, start, controlFit);
}

/**
 * Create a baseline for a fit, before the parameters to be varied in
 * the fit are known. This runs an integration with the base
 * parameters and returns everything that {@link wodinFit} would.
 */
export function wodinFitBaseline(Model: OdinModelConstructable, data: FitData,
                                 pars: UserType, modelledSeries: string,
                                 controlODE: Partial<DopriControlParam>) {
    const parsFit = { base: pars, vary: [] };
    const target = fitTarget(Model, data, parsFit, modelledSeries, controlODE);
    return target([]);
}
