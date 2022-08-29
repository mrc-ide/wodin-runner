import {
    Dust,
    DustModelConstructable,
    DustStateTime,
    Pars as DustPars,
// } from "@reside-ic/dust";
} from "../node_modules/@reside-ic/dust/lib/index";

import { seq } from "./util";

/**
 * A solution for discrete/stochastic models, where we expect multiple
 * replicates of each series to be present, and where interpolation is
 * not possible.  
 */
export interface DiscreteSolution {
    /** Names of elements in the series */
    names: string[];
    /** Steps that the solution is available at */
    steps: number[];
    /** The model output */
    state: DustStateTime;
}

/**
 * Run a discrete time model, most likely a stochastic one. This is
 * only a little similar to the continuous time (ODE) version {@link
 * wodinRun} because almost always here we are interested in running a
 * set of realisations, which we'll call "particles" to match the
 * terminology used in dust.
 *
 * @param Model A Dust-compatible model constructor. An {@link
 * OdinModelConstructable} will not work!
 *
 * @param pars Parameters for the model. Currently this is a little
 * different to {@link wodinRun} (TODO: fix before merge!)
 * 
 * @param stepStart The step number to start from. 0 is a good choice.
 *
 * @param stepEnd The step number to run to. Typically you'll have
 * some idea of time scaling on the steps (e.g., `time = step * dt`,
 * where `dt` is the size of each step in units of time), but that's
 * just a convention at the model level.
 *
 * @param nParticles The number of independent trajectories to run.
 */
export function runModelDiscrete(Model: DustModelConstructable,
                                 pars: DustPars, stepStart: number,
                                 stepEnd: number,
                                 nParticles: number): DiscreteSolution {
    const d = new Dust(Model, pars, nParticles, stepStart);
    // TODO: if we have any array variables, this is going to need
    // some work, but that's the case all through the package and
    // currently prevented by mrc-3468.
    const names = d.info().map((el: any) => el.name);
    const steps = seq(stepStart, stepEnd); // inclusive!
    const state = d.simulate(steps, null);
    return { names, steps, state };
}
