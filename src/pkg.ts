import type { DopriControlParam } from "dopri";

import { base } from "./base";
import type { OdinModel, OdinModelConstructable, Solution } from "./model";
import {isODEModel, runModel} from "./model";
import type { UserType } from "./user";

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
     * @param unusedUserAction String, describing the action to take
     * if there are unknown values in `pars` - possible values are
     * "error", "ignore", "warning" and "message"
     */
    constructor(Model: OdinModelConstructable, pars: UserType, unusedUserAction: string) {
        this.model = new Model(base, pars, unusedUserAction);
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
        this.model.setUser(pars, unusedUserAction);
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

// one big question is how much we really want to try and support the
// existing interface in odin as possible, given we don't really like
// it and it's about time to try and move people onto dust?
//
//
// There are several difficulties here - the order of initialisation
// is different, which makes things a bit of a trick.
//
// We could add some support into dust to enable fetching the model
// out from the first particle which would be all we need here in
// order to access the initial() and rhs methods, though this then
// makes everything else a bit uglier
//
// It does seem that getting access to the model for the first
// particle mih be the easiest way of pulling thi all off ccorrectly.
export class PkgWrapperDiscrete {
    private readonly dust: Dust;

    constructor(Model: DustModelConstructable, pars: UserType,
                unusedUserAction: string) {
        const nParticles = 1;
        const stepStart = 0;
        const random = undefined;
        this.dust = new Dust(Model, pars, nParticles, step, random);
    }

    public initial(step: number) {
        
        // Can dust models really not do this?
    }

    public rhs(step: number, y: number[]) {
        // Also this, seems surprising?
    }

    public getMetadata() {
        const info = this.dust.info();
        // do some translation here into our general odin metadata format
    }

    public getInternal() {
        // we'd need to access some private bits to be able to pull
        // this off - model from Dust, then within that the private
        // internal field.
    }

    public setUser(pars: UserType, unusedUserAction: string) {
        // does this set internal state or not?
        this.dust.setPars(pars);
    }

    public run(step: number[], y0: number[] | null) {
        this.dust.setStep(step[0]);
        this.dust.setState(y0 ? [y0] : y0);
        const state = this.dust.simulate(step, null);
        // quick map here to build a matrix over time.
        const y = [];
        // and a bit of faff to convert arrays into the correct format
        // for odin's names, annoyingly (especially as we have that
        // already).
        const names = []; 
        return { names, y };
        }
    }
               
}
