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

export enum TimeMode {
    Grid = "grid",
    Given = "given",
}

/**
 * Evenly spaced time between `tStart` and `tEnd`
 */
export interface TimeGrid {
    /** Literal field, indicates this represents a grid of times */
    mode: TimeMode.Grid;
    /** Start time to return the solution (cannot be less than the
     *  originally used `tStart` - we will increase it to the original
     *  `tStart` in that case)
     */
    tStart: number;
    /** End time to return the solution (cannot be more than the
     *  originally used `tEnd` - we will reduce it to the original
     *  `tEnd` in that case)
     */
    tEnd: number;
    /** Number of points to return - must be at least
     * one, and points will be evenly spaced between `tStart` and `tEnd`
     */
    nPoints: number;
}

/**
 * A set of times corresponding to some given list of times (e.g.,
 * along a data set).
 */
export interface TimeGiven {
    /** Literal field, indicates this represents a given array of times */
    mode: TimeMode.Given;
    /** A vector of times to return the solution at */
    times: number[];
}

/**
 * A union type representing times that a solution should be computed
 * at, passed to {@link InterpolatedSolution}
 */
export type Times = TimeGrid | TimeGiven;

function interpolationTimes(times: Times, tStart: number,
                            tEnd: number): number[] {
    switch (times.mode) {
        case TimeMode.Grid:
            return grid(Math.max(tStart, times.tStart),
                        Math.min(tEnd, times.tEnd),
                        times.nPoints);
        case TimeMode.Given:
            // We could check here that the solution spans the
            // requested times but that probably causes more issues
            // than it's worth?
            return times.times;
    }
}

/**
 * An interpolated solution to a system of differential equations,
 * typically created via {@link wodinRun}
 *
 * @param times An object representing the times to return the solution at.
 */
export type InterpolatedSolution = (times: Times) => SeriesSet2;

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
    return (times: Times): SeriesSet => {
        const t = interpolationTimes(times, tStart, tEnd);
        const result = solution(t);
        const values = names.map(
            (_: any, i: number) => ({
                name: name[i],
                y: result.map((row: number[]) => row[i])
            }));
        return { values, x: t };
    };
}
