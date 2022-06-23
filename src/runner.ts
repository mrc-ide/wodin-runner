import * as dopri from "dopri";

import * as base from "./base";
import type { Solution } from "./delay";
import type { UserType } from "./user";

export type OdinModelConstructable =
    new(base: any, pars: UserType, unknownAction: string) => OdinModel;

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

function isDDEModel(model: OdinModel): model is OdinModelDDE {
    return model.rhs.length === 4;
}

export type OdinModel = OdinModelODE | OdinModelDDE;

// tslint:disable-next-line:variable-name
export function wodinRun(Model: OdinModelConstructable, pars: UserType,
                         tStart: number, tEnd: number,
                         control: any) {
    const model = new Model(base, pars, "error");
    const solution = (
        isDDEModel(model) ?
            wodinRunDDE(model as OdinModelDDE, tStart, tEnd, control) :
            wodinRunODE(model as OdinModelODE, tStart, tEnd, control));
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
        // Without 'as' here, TS thinks that model.output could be
        // rebound and no longer a function. We tried saving
        //   const output = model.output;
        // which pleases the compiler but then fails at runtime.
        // tslint:disable-next-line:ban-types
        output = (t: number, y: number[]) => (model.output as Function)(t, y);
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
        // As above for the ODE version
        output = (t: number, y: number[], solution: Solution) =>
            // tslint:disable-next-line:ban-types
            (model.output as Function)(t, y, solution);
    }

    const y0 = model.initial(tStart);
    const solver = new dopri.DDE(rhs, y0.length, control, output);
    solver.initialise(tStart, y0);
    return solver.run(tEnd);
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
