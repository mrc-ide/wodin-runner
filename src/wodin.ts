import type { DopriControlParam } from "dopri";

import { base } from "./base";
import type { OdinModelConstructable, Solution } from "./model";
import {runModel} from "./model";
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
    /**
     * @param t0 Start time to return the solution (cannot be less
     * than `tStart` - we will increase it to `tStart` in that case)
     *
     * @param t1 End time to return the solution (cannot be more than
     * `tEnd` - we will reduce it to `tEnd` in that case)
     *
     * @param nPoints Number of points to return - must be at least
     * two, and points will be evenly spaced between `t0` and `t1`
     *
     * @return Returns an array where each element represents a
     * series. Each element is an object with fields `name` (the name
     * of the series), `x` (the time values - these will be the same
     * for every series) and `y` (the series value at each time, the
     * same length as `x`).
     */
    return (t0: number, t1: number, nPoints: number) => {
        const t = grid(Math.max(t0, tStart), Math.min(t1, tEnd), nPoints);
        const y = solution(t);
        // Unfortunately adding typedoc annotations here does not
        // propagate them up above.
        return y[0].map((_: any, i: number) => ({
            name: names[i],
            x: t,
            y: y.map((row: number[]) => row[i]),
        }));
    };
}

export function grid(a: number, b: number, len: number) {
    const dx = (b - a) / (len - 1);
    const x = [];
    for (let i = 0; i < len - 1; ++i) {
        x.push(a + i * dx);
    }
    x.push(b);
    return x;
}
