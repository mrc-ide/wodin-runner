import * as dopri from "dopri";

import {InternalStorage, UserType} from "./user";

// Probably this is something that dopri should export for us, we
// could also use its types for the rhs and output members below.
export type Solution = (t: number) => number[];

export type OdinModelConstructable =
    new(base: any, pars: UserType, unknownAction: string) => OdinModel;

interface OdinModelODE {
    setUser(pars: UserType, unknownAction: string): void;
    initial(t: number): number[];
    rhs(t: number, y: number[], dydt: number[]): void;
    output?(t: number, y: number[]): number[];
    names(): string[];
    getInternal(): InternalStorage;
    getMetadata(): any;
}

interface OdinModelDDE {
    setUser(pars: UserType, unknownAction: string): void;
    initial(t: number): number[];
    rhs(t: number, y: number[], dydt: number[], solution: Solution): void;
    output?(t: number, y: number[], solution: Solution): number[];
    names(): string[];
    getInternal(): InternalStorage;
    getMetadata(): any;
}

export function isDDEModel(model: OdinModel): model is OdinModelDDE {
    return model.rhs.length === 4;
}

export function isODEModel(model: OdinModel): model is OdinModelODE {
    return model.rhs.length === 3;
}

export type OdinModel = OdinModelODE | OdinModelDDE;

export function runModel(model: OdinModel, y0: number[] | null,
                         tStart: number, tEnd: number,
                         control: any) {
    return isDDEModel(model) ?
        runModelDDE(model as OdinModelDDE, y0, tStart, tEnd, control) :
        runModelODE(model as OdinModelODE, y0, tStart, tEnd, control);
}

function runModelODE(model: OdinModelODE, y0: number[] | null,
                     tStart: number, tEnd: number, control: any) {
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

    if (y0 === null) {
        y0 = model.initial(tStart);
    }
    const solver = new dopri.Dopri(rhs, y0.length, control, output);
    solver.initialise(tStart, y0);
    return {solution: solver.run(tEnd),
            statistics: solver.statistics()};
}

function runModelDDE(model: OdinModelDDE, y0: number[] | null,
                     tStart: number, tEnd: number, control: any) {
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

    if (y0 === null) {
        y0 = model.initial(tStart);
    }

    const internal = model.getInternal();
    internal["initial_t"] = tStart;

    const solver = new dopri.DDE(rhs, y0.length, control, output);
    solver.initialise(tStart, y0);
    return {solution: solver.run(tEnd),
            statistics: solver.statistics()};
}
