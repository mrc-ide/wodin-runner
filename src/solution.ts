import { FullSolution } from "./model";
import { grid } from "./util";

/**
 * We return a set of series from a few different places:
 *
 * * {@link wodinRun} returns the full set of series
 * * {@link wodinFit} returns a single series with just the fit data
 * * {@link batchRun} returns a number of full sets of series
 *
 * Later, when we get going with the stochastic interface, we'll need
 * a slightly more flexible interface perhaps because we'll have a
 * number of trajectories at once, and along with them summary
 * statistics such as the mean or median.
 *
 * Using some key-value mapping will likely end up being a bit
 * limiting eventually, because we have no easy place to store the
 * metadata that we'll want (these 5 traces all correspond to variable
 * 'x' with some parameter for example). So here, we'll use something
 * deliberately simple but easy to extend. It does not try to closely
 * match the plotly interface (wodin will take care of that instead).
 *
 * Later, we might want to swap the modelling of `y` for something
 * slightly more flexible (either using a multidimensional array or
 * allowing `y` to contain something more exotic per series).
 */
export interface SeriesSet {
    /** Names of elements in the series */
    names: string[];
    /** The domain that the series is available at, typically time  */
    x: number[];
    /**
     * The values of traces; will have length `names.length` and each
     * element will have length `x.length`, so that `y[i][j]` is the
     * `j`th time point of the `i`th series
     */
    y: number[][];
}

/**
 * An interpolated solution to a system of differential equations,
 * typically created via {@link wodinRun}
 *
 * @param t0 Start time to return the solution (cannot be less than
 * the originally used `tStart` - we will increase it to `tStart` in
 * that case)
 *
 * @param t1 End time to return the solution (cannot be more than the
 * originally used `tEnd` - we will reduce it to `tEnd` in that case)
 *
 * @param nPoints Number of points to return - must be at least
 * one, and points will be evenly spaced between `t0` and `t1`
 */
export type InterpolatedSolution =
    (t0: number, t1: number, nPoints: number) => SeriesSet;

/**
 * Conversion function for Dopri output into plotly input, allowing
 * efficient re-interpolation of subsets of the graph.
 *
 * @param solution The solution as returned from the solver
 *
 * @param names Vector of names for the traces
 *
 * @param tStart Starting time for the integration
 *
 * @param tEnd End time for the integration
 */
export function interpolatedSolution(solution: FullSolution,
                                     names: string[],
                                     tStart: number,
                                     tEnd: number): InterpolatedSolution {
    return (t0: number, t1: number, nPoints: number): SeriesSet => {
        const t = grid(Math.max(tStart, t0), Math.min(tEnd, t1), nPoints);
        const values = solution(t);
        // this is basically a transpose, pulling out every series in
        // turn
        const y = values[0].map(
            (_: any, i: number) => values.map((row: number[]) => row[i]));
        return { names, x: t, y };
    };
}
