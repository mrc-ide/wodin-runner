import * as dopri from "dopri";
export type UserType = Map<string, number>;
export type InternalStorage = Record<string, number | number[]>;
type Solution = (t: number) => number[];

export type OdinModelConstructable = new(pars: UserType, unknownAction: string) => OdinModel;

interface OdinModelODE {
    initial(t: number): number[];
    rhs(t: number, y: number[], dydt: number[]): void;
    output?(t: number, y: number[]): number[];
    names(): string[];
}

interface OdinModelDDE {
    initial(t: number): number[];
    rhs(t: number, y: number[], dydt: number[], solution: Solution): void;
    output?(t: number, y: number[], solution: Solution): number[];
    names(): string[];
}

export type OdinModel = OdinModelODE | OdinModelDDE;

// tslint:disable-next-line:variable-name
export function wodinRun(Model: OdinModelConstructable, pars: UserType,
                         tStart: number, tEnd: number,
                         control: any) {
    const model = new Model(pars, "error");
    const solution = (
        model.rhs.length === 4 ?
            wodinRunDDE(model as OdinModelDDE, tStart, tEnd, control) :
            wodinRunODE(model as OdinModelODE, tStart, tEnd, control));
    // const solution = wodinRunODE(model, tStart, tEnd, control);
    const names = model.names();
    return (t0: number, t1: number, nPoints: number) => {
        const t = grid(Math.max(0, t0), Math.min(t1, tEnd), nPoints);
        const y = solution(t);
        return y[0].map((_: any, i: number) => ({
            name: names[i], x: t, y: y.map((row: number[]) => row[i])}));
    };
}

function wodinRunODE(model: OdinModelODE, tStart: number, tEnd: number,
                     control: any) {
    // tslint:disable-next-line:only-arrow-functions
    const rhs = function(t: number, y: number[], dydt: number[]) {
        model.rhs(t, y, dydt);
    };

    let output = null;
    if (typeof model.output === "function") {
        const outputFunc = model.output; // avoids ts complaint
        output = (t: number, y: number[]) => outputFunc(t, y);
    }

    const y0 = model.initial(tStart);
    const solver = new dopri.Dopri(rhs, y0.length, control, output);
    solver.initialise(tStart, y0);
    return solver.run(tEnd);
}

function wodinRunDDE(model: OdinModelDDE, tStart: number, tEnd: number,
                     control: any) {
    // tslint:disable-next-line:only-arrow-functions
    const rhs = function(t: number, y: number[], dydt: number[],
                         solution: Solution) {
        model.rhs(t, y, dydt, solution);
    };

    let output = null;
    if (typeof model.output === "function") {
        const outputFunc = model.output; // avoids ts complaint
        output = (t: number, y: number[], solution: Solution) =>
            outputFunc(t, y, solution);
    }

    const y0 = model.initial(tStart);
    const solver = new dopri.DDE(rhs, y0.length, control, output);
    solver.initialise(tStart, y0);
    return solver.run(tEnd);
}

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
