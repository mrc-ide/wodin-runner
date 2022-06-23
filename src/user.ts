export interface UserTensor {
    data: number[];
    dim: number[];
}
export type UserValue = number | number[] | UserTensor;
export type UserType = Map<string, UserValue>;
export type InternalStorage = Record<string, number | number[]>;

export function checkUser(user: UserType, allowed: string[],
                          unusedUserAction: string) {
    if (unusedUserAction === "ignore") {
        return;
    }
    const err = [];
    for (const k of user.keys()) {
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

export function getUserScalar(user: UserType, name: string,
                              internal: InternalStorage,
                              defaultValue: number | null, min: number,
                              max: number, isInteger: boolean) {
    const value = user.get(name);
    if (value === undefined) {
        if (defaultValue === null) {
            throw Error(`Expected a value for '${name}'`);
        } else {
            internal[name] = defaultValue;
        }
    } else {
        if (typeof value !== "number") {
            throw Error(`Expected a scalar for '${name}'`);
        }
        getUserCheckValue(value, min, max, isInteger, name);
        internal[name] = value;
    }
}

export function getUserArrayFixed(user: UserType, name: string,
                                  internal: InternalStorage,
                                  size: number[],
                                  min: number,
                                  max: number,
                                  isInteger: boolean) {
    let value = user.get(name);
    if (value === undefined) {
        throw Error("Expected a value for '" + name + "'");
    } else {
        const rank = size.length - 1;
        value = getUserArrayCheckType(value, name);
        getUserArrayCheckRank(rank, value, name);
        getUserArrayCheckDimension(size, value, name);
        getUserArrayCheckContents(value, min, max, isInteger, name);
        internal[name] = value.data.slice();
    }
}

// This one is used where we have
//
//   dim(x) <- user()
//
// which means that the extents are set based on the given array
// (rather than some known value within size) and we report the values
// back into the size variable. odin will then generate code that sets
// the appropriate sizes into 'internal' later - we might move that
// into here later.
export function getUserArrayVariable(user: UserType, name: string,
                                     internal: InternalStorage,
                                     size: number[],
                                     min: number,
                                     max: number,
                                     isInteger: boolean) {
    let value = user.get(name);
    if (value === undefined) {
        throw Error("Expected a value for '" + name + "'");
    } else {
        const rank = size.length - 1;
        value = getUserArrayCheckType(value, name);
        getUserArrayCheckRank(rank, value, name);
        getUserArrayCheckContents(value, min, max, isInteger, name);
        size[0] = value.data.length;
        for (let i = 0; i < rank; ++i) {
            size[i + 1] = value.dim[i];
        }
        internal[name] = value.data.slice();
    }
}

function getUserArrayCheckType(value: UserValue, name: string) {
    if (Array.isArray(value)) {
        value = {data: value, dim: [value.length]};
    } else if (typeof value === "number") {
        // promote scalar number to vector, in the hope that's close
        // enough to what the user wants; this does give some
        // reasonable error messages relative to the C version.
        value = {data: [value], dim: [1]}
    }
    return value;
}

function getUserArrayCheckRank(rank: number, value: UserTensor, name: string) {
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

function getUserArrayCheckDimension(dim: number[], value: UserTensor,
                                    name: string) {
    const rank = dim.length - 1;
    for (let i = 0; i < rank; ++i) {
        const expected = dim[i + 1];
        if (value.dim[i] !== expected) {
            if (rank == 1) {
                throw Error(`Expected length ${expected} value for '${name}'`);
            } else {
                throw Error(`Incorrect size of dimension ${i + 1} of '${name}' (expected ${expected})`);
            }
        }
    }
}

function getUserArrayCheckContents(value: UserTensor, min: number, max: number, isInteger: boolean, name: string) {
    for (let i = 0; i < value.data.length; ++i) {
        const x = value.data[i];
        if (x === null) {
            throw Error(`'${name}' must not contain any NA values`);
        }
        getUserCheckValue(x, min, max, isInteger, name);
    }
}

function getUserCheckValue(value: number, min: number, max: number, isInteger: boolean, name: string) {
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
