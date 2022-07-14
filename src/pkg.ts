import type { DopriControlParam } from "dopri";

import { base } from "./base";
import type { OdinModel, OdinModelConstructable, Solution } from "./model";
import {isODEModel, runModel} from "./model";
import type { UnusedUserAction, UserType } from "./user";

/**
 * Wrapper class around an {@link OdinModel} designed to be driven
 * from the [R package odin](https://github.com/mrc-ide/odin)
 */
export class PkgWrapper {
    private model: OdinModel;

    /**
     * @param Model The model to wrap
     *
     * @param pars Parameters to set into the model on construction
     *
     * @param unusedUserAction The action to take if there are unknown
     * values in `pars`
     */
    constructor(Model: OdinModelConstructable, pars: UserType,
                unusedUserAction: string) {
        this.model = new Model(base, pars, unusedUserAction as UnusedUserAction);
    }

    /**
     * Compute initial conditions of the model
     *
     * @param t The time to compute initial conditions at
     */
    public initial(t: number) {
        return this.model.initial(t);
    }

    /**
     * Compute derivatives of the model
     *
     * @param t The time to compute the derivatve at
     *
     * @param y The value of the variables
     */
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
        return {
            /** Output, if the model has an `output` method, `null` otherwise */
            output,
            /** Derivatives of the state variables */
            state,
        };
    }

    /**
     * Return metadata about the model - odin uses this internally.
     */
    public getMetadata() {
        return this.model.getMetadata();
    }

    /**
     * Return the state of the internal storage - odin uses this for
     * debugging and testing.
     */
    public getInternal() {
        return this.model.getInternal();
    }

    /**
     * Change parameters in a model after it has been initialised.
     *
     * @param pars Parameters to set. Values that are omitted are not
     * replaced by their defaults.
     *
     * @param unusedUserAction Action to take if unknown values are
     * found in `pars`, see {@link PkgWrapper.constructor}
     */
    public setUser(pars: UserType, unusedUserAction: string) {
        this.model.setUser(pars, unusedUserAction as UnusedUserAction);
    }

    /**
     * Run the model, returning output at particular points in
     * time. Note that this is quite a different interface to that
     * used in {@link wodinRun} in order to match the interface
     * expected by odin, but also due to limitations of what can be
     * carried across the R/JS boundary.
     *
     * @param t A vector of times to integrate over. Must be in
     * increasing order, and at least two values given. The first time
     * is the time that the integration starts from.
     *
     * @param y0 Initial conditions, or `null` to use values from
     * {@link PkgWrapper.initial}
     *
     * @param control Control parameters, passed through to the solver, see
     * [`dopri.DopriControlParam`](https://mrc-ide.github.io/dopri-js/interfaces/DopriControlParam.html)
     */
    public run(t: number[], y0: number[] | null,
               control: Partial<DopriControlParam>) {
        const tStart = t[0];
        const tEnd = t[t.length - 1];
        const result = runModel(this.model, y0, tStart, tEnd, control);
        return {
            /** Names of all variables (and outputs) in the system */
            names: this.model.names(),
            /** Statistics from the solver about work done */
            statistics: result.statistics,
            /** Array-of-arrays with the result `y[i][j]` is the `j`th
             * output at the `i`th time
             */
            y: result.solution(t),
        };
    }
}
