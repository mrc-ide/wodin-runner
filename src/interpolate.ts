import {
    InterpolatorBase,
    InterpolatorConstant,
    InterpolatorLinear,
    InterpolatorSpline,
} from "@reside-ic/interpolate";

/**
 * Information about interpolation bounds
 */
interface InterpolateTimes {
    /** The minimum time supported by the interpolation functions */
    max: number;
    /** The maximum time supported by the interpolation functions */
    min: number;
}

/** Allocate a new interpolation function object
 *
 * @param method Interpolation method to use; one of `constant`,
 * `linear` or `spline`
 *
 * @param t Array of interpolation times
 *
 * @param y Array of interpolation response variables
 */
export function interpolateAlloc(method: string,
                                 t: number[], y: number[]): InterpolatorBase {
    const yy = tensorToArray(y, t.length);
    if (method === "constant") {
        return new InterpolatorConstant(t, yy);
    } else if (method === "linear") {
        return new InterpolatorLinear(t, yy);
    } else if (method === "spline") {
        return new InterpolatorSpline(t, yy);
    } else {
        throw Error(`Invalid interpolation method '${method}'`);
    }
}

/** Check that interpolation values are reasonable; this is called
 * before allocation, once per model initialisation or parameter
 * setting
 */
export function interpolateCheckY(dimArg: number[], dimTarget: number[],
                                  nameArg: string, nameTarget: string) {
    if (dimTarget.length === 1) {
        if (dimArg[0] !== dimTarget[0]) {
            throw Error(`Expected ${nameArg} to have length ${dimArg[0]}` +
                        ` (for ${nameTarget})`);
        }
    } else {
        for (let i = 0; i < dimTarget.length; ++i) {
            if (dimArg[i] !== dimTarget[i]) {
                throw Error(`Expected dimension ${i + 1} of ${nameArg}` +
                            ` to have size ${dimArg[i]} (for ${nameTarget})`);
            }
        }
    }
}

/** Check that the integration times are compatible with the
 * interpolation functions (i.e., that they would not cause
 * extrapolation). If the model does not have
 *
 * @param tStart Start time of the integration
 *
 * @param tEnd End time of the integration
 *
 * @param times Information about the interpolation bounds
 */
export function interpolateCheckT(tStart: number, tEnd: number,
                                  times?: InterpolateTimes) {
    if (times === undefined) {
        return Infinity;
    }
    if (tStart < times.min) {
        throw Error("Integration times do not span interpolation range;" +
                    ` min: ${times.min}`);
    }
    if (tEnd > times.max) {
        throw Error("Integration times do not span interpolation range;" +
                    ` max: ${times.max}`);
    }
    // This logic needs tweaking once we expose the critical time
    // interface more broadly (i.e., where any model can add a
    // critical time; mrc-3418)
    return times.max;
}

export function interpolateTimes(start: number[], end: number[]): InterpolateTimes {
    // min time would be the latest (max) interpolation start
    const min = Math.max(...start);
    // max time would be the earliest (min) interpolation end
    const max = Math.min(...end);
    return {max, min};
}

export const interpolate = {
    alloc: interpolateAlloc,
    checkY: interpolateCheckY,
    times: interpolateTimes,
};

function tensorToArray(y: number[], len: number) {
    if (y.length === len) {
        return [y];
    }
    const ret = [];
    const n = y.length / len;
    for (let i = 0; i < n; ++i) {
        ret.push(y.slice(len * i, len * (i + 1)));
    }
    return ret;
}
