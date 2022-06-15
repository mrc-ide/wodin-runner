export type UserType = Map<string, number>;
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
                              defaultValue: number | null, min: number | null,
                              max: number | null, isInteger: boolean) {
    const value = user.get(name);
    if (value === undefined) {
        if (defaultValue === null) {
            throw Error(`Expected a value for '${name}'`);
        } else {
            internal[name] = defaultValue;
        }
    } else {
        if (min !== null && value < min) {
            throw Error(`Expected '${name}' to be at least ${min}`);
        }
        if (max !== null && value > max) {
            throw Error(`Expected '${name}' to be at most ${max}`);
        }
        if (isInteger && !Number.isInteger(value)) {
            throw Error(`Expected '${name}' to be integer-like`);
        }
        internal[name] = value;
    }
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
