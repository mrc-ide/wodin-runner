import * as base from "./base";
import type { OdinModel, OdinModelConstructable, Solution } from "./model";
import {isODEModel, runModel} from "./model";
import type { UserType } from "./user";

export class PkgWrapper {
    private model: OdinModel;

    // tslint:disable-next-line:variable-name
    constructor(Model: OdinModelConstructable, pars: UserType, unusedUserAction: string) {
        this.model = new Model(base, pars, unusedUserAction);
    }

    public initial(t: number) {
        return this.model.initial(t);
    }

    public rhs(t: number, y: number[]) {
        const state = new Array(y.length).fill(0);
        let output = null;

        if (isODEModel(this.model)) {
            const model = this.model;
            this.model.rhs(t, y, state);
            if (this.model.output) {
                output = this.model.output(t, y);
            }
        } else {
            throw Error("Can't use rhs() with delay models");
        }
        return {output, state};
    }

    public getMetadata() {
        return this.model.getMetadata();
    }

    public getInternal() {
        return this.model.getInternal();
    }

    public setUser(pars: UserType, unusedUserAction: string) {
        this.model.setUser(pars, unusedUserAction);
    }

    public run(t: number[], y0: number[] | null, control: any) {
        const tStart = t[0];
        const tEnd = t[t.length - 1];
        const result = runModel(this.model, y0, tStart, tEnd, control);
        return {names: this.model.names(),
                statistics: result.statistics,
                y: result.solution(t)};
    }
}
