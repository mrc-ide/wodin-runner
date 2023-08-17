import { FullSolution } from "./model";
import { grid } from "./util";
import {UserType} from "./user";

/**
 * We return a set of series from two different places:
 *
 * * {@link wodinRun} returns the full set of series
 * * {@link batchRun} returns a number of full sets of series
 */
export interface SeriesSet {
    /** The domain that the series is available at, typically time  */
    x: number[] ;
    /** An array of individual traces, each of which are defined over
     * the same set of `x` values.
     */
    values: SeriesSetValues[];
}

export interface UserTypeSeriesSet {
    /** The domain that the series is available at, as a combination of values of the varying parameters  */
    x: UserType[] ;
    /** An array of individual traces, each of which are defined over
     * the same set of `x` values.
     */
    values: SeriesSetValues[];
}


export interface SeriesSetValues {
    /**
     * An optional description for this series. This is useful if you
     * have more than one element with the same `name` within a
     * particular `SeriesSet`
     */
    description?: string;
    /** The name of the series */
    name: string;
    /** The value of the traces, over the time domain */
    y: number[];
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
export type InterpolatedSolution = (times: Times) => SeriesSet;

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
                name: names[i],
                y: result.map((row: number[]) => row[i]),
            }));
        return { values, x: t };
    };
}
