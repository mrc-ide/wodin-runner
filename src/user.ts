/** Store vectors and multidimensional arrays. Rather than store a
 *  matrix of data like
 * ```typescript
 * [[ 0,  1,  2,  3],
 *  [ 4,  5,  6,  7],
 *  [ 8,  9, 10, 11]]
 * ```
 * we store this as
 *
 * ```typescript
 * {
 *     data: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
 *     dim: [4, 3]
 * }
 * ```
 *
 * This is modelled on the way that odin stores matrices. In odin
 * syntax, the element `m[2, 3]` has value 9.
 */
export interface UserTensor {
    /** The data, as a single array */
    data: number[];
    /** The dimensions as a relatively short array (length 1 to 3 for
     *  odin-js curently, limited by support in sums)
     */
    dim: number[];
}

/**
 * Valid values that may be passed in within a {@link UserType} map
 */
export type UserValue = number | number[] | UserTensor;

/**
 * A key-value map of user-provided parameters
 */
export type UserType = Map<string, UserValue>;

/**
 * The data type corresponding to odin's internal data structures - a
 * key-value mapping of name to numbers or vectors. Returned by {@link
 * OdinModelODE.getInternal | OdinModelODE.getInternal} and not
 * generally meant for end-user consumption except for in debugging.
 */
export type InternalStorage = Record<string, number | number[]>;

/**
 * Validate that a provided set of parameters `pars` contains only the
 * values in `allowed`, handling this as requested by
 * `unusedUserAction`
 *
 * @param pars User-provided parameters for the model
 *
 * @param allowed Names of allowed user parameters
 *
 * @param unusedUserAction String, describing the action to take
 * if there are unknown values in `pars` - possible values are
 * "error", "ignore", "warning" and "message"
 */
export function checkUser(pars: UserType, allowed: string[],
                          unusedUserAction: string) {
    if (unusedUserAction === "ignore") {
        return;
    }
    const err = [];
    for (const k of pars.keys()) {
        if (!allowed.includes(k)) {
            err.push(k);
        }
    }
    if (err.length > 0) {
        const msg = "Unknown user parameters: " + err.join(", ");
        if (unusedUserAction === "message") {
            console.log(msg);
        } else if (unusedUserAction === "warning") {
            console.warn(msg);
        } else if (unusedUserAction === "stop") {
            throw Error(msg);
        } else {
            throw Error(msg + " (and invalid value for unusedUserAction)");
        }
    }
}

/** Set a scalar parameter provided by the user. This function will
 * throw if the parameter violates the constraint, or if none is
 * provided and no default is given and no value for this parameter
 * has previously been set.
 *
 * @param pars User-provided parameters for the model
 *
 * @param name Name of the parameter to set
 *
 * @param internal The model's internal data; the parameter will be
 * updated here
 *
 * @param default A default value for the parameter, or `null` if the
 * parameter is required
 *
 * @param min The minimum allowed value for the parameter; use
 * `-Infinity` if there is no minimum
 *
 * @param max The maximum allowed value for the parameter; use
 * `Infinity` if there is no maximum
 *
 * @param isInteger Check that the provided value is an integer```
 */
export function setUserScalar(pars: UserType, name: string,
                              internal: InternalStorage,
                              defaultValue: number | null, min: number,
                              max: number, isInteger: boolean) {
    const value = pars.get(name);
    if (value === undefined) {
        if (internal[name] !== undefined) {
            return;
        }
        if (defaultValue === null) {
            throw Error(`Expected a value for '${name}'`);
        }
        internal[name] = defaultValue;
    } else {
        if (typeof value !== "number") {
            throw Error(`Expected a number for '${name}'`);
        }
        setUserCheckValue(value, min, max, isInteger, name);
        internal[name] = value;
    }
}

/** Set an array parameter with known (fixed) size provided by the
 * user. This function will throw if the parameter violates the
 * constraint, or if none is provided and no value for this parameter
 * has previously been set.
 *
 * @param pars User-provided parameters for the model
 *
 * @param name Name of the parameter to set
 *
 * @param size Array of dimension sizes; this must be a vector of `n +
 * 1` values for a tensor of rank `n` (e.g., length 3 for a matrix),
 * with the first value containing the total length of the vector and
 * the remaining values being the length of each dimension. The first
 * number will therefore be the product of the remaining numbers.
 *
 * @param min The minimum allowed value for the parameter; use
 * `-Infinity` there is no minimum
 *
 * @param max The maximum allowed value for the parameter; use
 * `Infinity` there is no maximum
 *
 * @param isInteger Check that the provided value is an integer
 */
export function setUserArrayFixed(pars: UserType, name: string,
                                  internal: InternalStorage,
                                  size: number[],
                                  min: number,
                                  max: number,
                                  isInteger: boolean) {
    let value = pars.get(name);
    if (value === undefined) {
        if (internal[name] !== undefined) {
            return;
        }
        throw Error(`Expected a value for '${name}'`);
    } else {
        const rank = size.length - 1;
        value = setUserArrayCheckType(value, name);
        setUserArrayCheckRank(rank, value, name);
        setUserArrayCheckDimension(size, value, name);
        setUserArrayCheckContents(value, min, max, isInteger, name);
        internal[name] = value.data.slice();
    }
}

/** Set an array parameter with known (fixed) size provided by the
 * user. This function will throw if the parameter violates the
 * constraint, or if none is provided and no value for this parameter
 * has previously been set.
 *
 * This is the method used where the odin model contains
 *
 * ```r
 * x[, ] <- user()
 * dim(x) <- user()
 * ```
 *
 * which means that the extents are set based on the given array
 * (rather than some known value within size) and we report the values
 * back into the `size` variable and odin will then generate code that
 * sets the appropriate sizes into `internal` later - we might move
 * that into here later.
 *
 * @param pars User-provided parameters for the model
 *
 * @param name Name of the parameter to set
 *
 * @param size Array of dimension sizes; this must be a vector of `n +
 * 1` values for a tensor of rank `n` (e.g., length 3 for a
 * matrix). This array will be written into on return with the size of
 * the recieved array.
 *
 * @param min The minimum allowed value for the parameter; use
 * `-Infinity` there is no minimum
 *
 * @param max The maximum allowed value for the parameter; use
 * `Infinity` there is no maximum
 *
 * @param isInteger Check that the provided value is a parameter
 */
export function setUserArrayVariable(pars: UserType, name: string,
                                     internal: InternalStorage,
                                     size: number[],
                                     min: number,
                                     max: number,
                                     isInteger: boolean) {
    let value = pars.get(name);
    if (value === undefined) {
        if (internal[name] !== undefined) {
            return;
        }
        throw Error("Expected a value for '" + name + "'");
    } else {
        const rank = size.length - 1;
        value = setUserArrayCheckType(value, name);
        setUserArrayCheckRank(rank, value, name);
        setUserArrayCheckContents(value, min, max, isInteger, name);
        size[0] = value.data.length;
        for (let i = 0; i < rank; ++i) {
            size[i + 1] = value.dim[i];
        }
        internal[name] = value.data.slice();
    }
}

function setUserArrayCheckType(value: UserValue, name: string) {
    if (Array.isArray(value)) {
        value = {data: value, dim: [value.length]};
    } else if (typeof value === "number") {
        // promote scalar number to vector, in the hope that's close
        // enough to what the user wants; this does give some
        // reasonable error messages relative to the C version.
        value = {data: [value], dim: [1]};
    }
    return value;
}

function setUserArrayCheckRank(rank: number, value: UserTensor, name: string) {
    if (value.dim.length !== rank) {
        if (rank === 1) {
            throw Error(`Expected a numeric vector for '${name}'`);
        } else if (rank === 2) {
            throw Error(`Expected a numeric matrix for '${name}'`);
        } else {
            throw Error(`Expected a numeric array of rank ${rank} for '${name}'`);
        }
    }
}

function setUserArrayCheckDimension(dim: number[], value: UserTensor,
                                    name: string) {
    const rank = dim.length - 1;
    for (let i = 0; i < rank; ++i) {
        const expected = dim[i + 1];
        if (value.dim[i] !== expected) {
            if (rank === 1) {
                throw Error(`Expected length ${expected} value for '${name}'`);
            } else {
                throw Error(`Incorrect size of dimension ${i + 1} of '${name}' (expected ${expected})`);
            }
        }
    }
}

function setUserArrayCheckContents(value: UserTensor, min: number, max: number, isInteger: boolean, name: string) {
    for (const x of value.data) {
        if (x === null) {
            throw Error(`'${name}' must not contain any NA values`);
        }
        setUserCheckValue(x, min, max, isInteger, name);
    }
}

function setUserCheckValue(value: number, min: number, max: number, isInteger: boolean, name: string) {
    // This exists to make the plain js interface more robust
    if (typeof value !== "number") {
        throw Error(`Expected a number for '${name}'`);
    }
    if (value < min) {
        throw Error(`Expected '${name}' to be at least ${min}`);
    }
    if (value > max) {
        throw Error(`Expected '${name}' to be at most ${max}`);
    }
    if (isInteger && !Number.isInteger(value)) {
        throw Error(`Expected '${name}' to be integer-like`);
    }
}

export const user = {
    checkUser,
    setUserArrayFixed,
    setUserArrayVariable,
    setUserScalar,
};
