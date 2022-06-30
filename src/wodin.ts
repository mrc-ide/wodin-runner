import type { DopriControlParam } from "dopri";

import { base } from "./base";
import { startFit } from "./fit";
import type { OdinModelConstructable, Solution } from "./model";
import { interpolatedSolution, runModel } from "./model";
import type { UserType } from "./user";

export {startFit as wodinFit} from "./fit";

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
