import { TimeMode } from "../src/solution";
import { wodinFit, wodinFitValue, wodinRun } from "../src/wodin";
import {UserTensor, UserValue} from "../src/user";
import {grid} from "../src/util";

import * as models from "./models";
import {approxEqualArray} from "./helpers";

// TODO: move this
describe("grid", () => {
    it("Can produce an array of numbers", () => {
        expect(grid(0, 10, 6)).toEqual([0, 2, 4, 6, 8, 10]);
    });
});

describe("can run basic models", () => {
    it("runs minimal model with expected output", () => {
        const user = {};
        const control : any = {};
        const solution = wodinRun(models.Minimal, user, 0, 10, control);

        const y = solution({ mode: TimeMode.Grid, tStart: 0, tEnd: 10, nPoints: 11 });
        const expectedT = grid(0, 10, 11);
        const expectedX = expectedT.map((t: number) => t + 1);
        expect(y.x).toEqual(expectedT);
        expect(y.values.length).toBe(1);
        expect(y.values[0].name).toBe("x");
        expect(approxEqualArray(y.values[0].y, expectedX)).toBe(true);
    });

    it("runs model with output, with expected output", () => {
        const user = { "a": 1 };
        const control : any = {};
        const solution = wodinRun(models.Output, user, 0, 10, control);

        const y = solution({ mode: TimeMode.Grid, tStart: 0, tEnd: 10, nPoints: 11 });
        const expectedT = grid(0, 10, 11);
        const expectedX = expectedT.map((t: number) => t + 1);
        const expectedY = expectedX.map((x: number) => x * 2);

        expect(y.x).toEqual(expectedT);
        expect(y.values.length).toBe(2);
        expect(y.values[0].name).toBe("x");
        expect(y.values[1].name).toBe("y");

        expect(approxEqualArray(y.values[0].y, expectedX)).toBe(true);
        expect(approxEqualArray(y.values[1].y, expectedY)).toBe(true);
    });

    it("runs delay model without error", () => {
        const user = {};
        const control : any = {};
        const solution = wodinRun(models.Delay, user, 0, 10, control);
        const y = solution({ mode: TimeMode.Grid, tStart: 0, tEnd: 10, nPoints: 11 });

        const expectedT = grid(0, 10, 11);
        const expectedX = expectedT.map((t: number) => t + 1);
        const expectedY = expectedT.map((t: number) => Math.max(1, t - 1));

        expect(y.x).toEqual(expectedT);
        expect(y.values.length).toBe(2);
        expect(y.values[0].name).toBe("x");
        expect(y.values[1].name).toBe("y");

        expect(approxEqualArray(y.values[0].y, expectedX)).toBe(true);
        expect(approxEqualArray(y.values[1].y, expectedY, 1e-3)).toBe(true);
    });

    it("runs delay model without output without error", () => {
        const user = {};
        const control : any = {};
        const solution = wodinRun(models.DelayNoOutput, user, 0, 10, control);
        const y = solution({ mode: TimeMode.Grid, tStart: 0, tEnd: 10, nPoints: 11 });

        const expectedT = grid(0, 10, 11);
        const expectedX = expectedT.map((t: number) => t + 1);
        const expectedY = [1, 2, 3, 4.5, 7, 10.5, 15, 20.5, 27, 34.5, 43];

        expect(y.x).toEqual(expectedT);
        expect(y.values.length).toBe(2);
        expect(y.values[0].name).toBe("x");
        expect(y.values[1].name).toBe("y");
        expect(approxEqualArray(y.values[0].y, expectedX)).toBe(true);
        expect(approxEqualArray(y.values[1].y, expectedY, 1e-3)).toBe(true);
    });

    it("runs a model with interpolation", () => {
        const pi = Math.PI;
        const tp = grid(0, pi, 31);
        const zp = tp.map((t: number) => Math.sin(t));
        const user = { tp, zp };
        const control : any = {};
        const solution = wodinRun(models.InterpolateSpline, user, 0, pi, control);

        const expectedT = grid(0, pi, 11);
        const expectedY = expectedT.map((t: number) => 1 - Math.cos(t));
        const y = solution({ mode: TimeMode.Grid, tStart: 0, tEnd: pi, nPoints: 11 });
        expect(approxEqualArray(y.values[0].y, expectedY, 1e-4)).toBe(true);
    });

    it("runs a model with interpolated arrays", () => {
        const tp = [0, 1, 2];
        const zp: UserTensor = {data: [0, 1, 0, 0, 2, 0], dim: [3, 2]};
        const user = { tp, zp };
        const control: any = {};
        const solution = wodinRun(models.InterpolateArray, user, 0, 3, control);
        const y = solution({ mode: TimeMode.Grid, tStart: 0, tEnd: 3, nPoints: 51 });
        const t = y.x;
        const z1 = t.map((t: number) => t < 1 ? 0 : (t > 2 ? 1 : t - 1));
        const z2 = t.map((t: number) => t < 1 ? 0 : (t > 2 ? 2 : 2 * (t - 1)));
        expect(approxEqualArray(y.values[0].y, z1, 6e-5)).toBe(true);
        expect(approxEqualArray(y.values[1].y, z2, 6e-5)).toBe(true);
    });
});

describe("can set user", () => {
    it("Agrees with mininal model", () => {
        const pars1 = {};
        const pars2 = { "a": 1 };
        const control : any = {};
        const solution1 = wodinRun(models.Minimal, pars1, 0, 10, control);
        const solution2 = wodinRun(models.User, pars2, 0, 10, control);
        const y1 = solution1({ mode: TimeMode.Grid, tStart: 0, tEnd: 10, nPoints: 11 });
        const y2 = solution2({ mode: TimeMode.Grid, tStart: 0, tEnd: 10, nPoints: 11 });
        expect(y1).toEqual(y2);
    });

    it("Can pick up default values", () => {
        const pars1 = {};
        const pars2 = { "a": 1 };
        const control : any = {};
        const solution1 = wodinRun(models.User, pars1, 0, 10, control);
        const solution2 = wodinRun(models.User, pars2, 0, 10, control);
        const y1 = solution1({ mode: TimeMode.Grid, tStart: 0, tEnd: 10, nPoints: 11 });
        const y2 = solution2({ mode: TimeMode.Grid, tStart: 0, tEnd: 10, nPoints: 11 });
        expect(y1).toEqual(y2);
    });

    it("Varies by changing parameters", () => {
        const pars = { "a": 2 };
        const control : any = {};
        const solution = wodinRun(models.User, pars, 0, 10, control);
        const y = solution({ mode: TimeMode.Grid, tStart: 0, tEnd: 10, nPoints: 11 });
        const expectedX = grid(0, 10, 11);
        const expectedY = expectedX.map((t: number) => t * 2 + 1);
        expect(y.x).toEqual(expectedX);
        expect(y.values.length).toBe(1);
        expect(y.values[0].name).toBe("x");
        expect(approxEqualArray(y.values[0].y, expectedY)).toBe(true);
    })
});

describe("can fit a simple line", () => {
    it("Can fit a simple model", () => {
        const time = [0, 1, 2, 3, 4, 5, 6];
        const data = {time, value: time.map((t: number) => 1 + t * 4)}
        const pars = {base: { a: 0.5 },
                      vary: ["a"]};
        const modelledSeries = "x";
        const controlODE = {};
        const controlFit = {};

        const opt = wodinFit(models.User, data, pars, modelledSeries,
                             controlODE, controlFit);
        const res = opt.run(100);
        expect(res.converged).toBe(true);
        expect(res.location[0]).toBeCloseTo(4);
        expect(res.value).toBeCloseTo(0);
        expect(res.data.pars["a"]).toEqual(res.location[0]);
        expect(res.data.endTime).toEqual(6);

        const yFit = res.data.solution({ mode: TimeMode.Grid, tStart: 0, tEnd: 6, nPoints: 7 });
        expect(yFit.x).toEqual(time);
        expect(yFit.values.length).toBe(1);
        expect(yFit.values[0].name).toBe("x")
        expect(approxEqualArray(yFit.values[0].y, data.value)).toBe(true);
    });

    it("Can fit a simple model with missing data", () => {
        const time = [0, 1, 2, 3, 4, 5, 6];
        const data = {time, value: time.map((t: number) => 1 + t * 4)}
        data.value[3] = NaN;
        const pars = {base: { a: 0.5 },
                      vary: ["a"]};
        const opt = wodinFit(models.User, data, pars, "x", {}, {});
        const res = opt.run(100);
        expect(res.converged).toBe(true);
        expect(res.location[0]).toBeCloseTo(4);
    });
});

describe("can get sum of squares from model solution", () => {
    it("returns correct number", () => {
        const time = [0, 1, 2, 3, 4, 5, 6];
        const data = {time, value: time.map((t: number) => 1 + t * 4)}
        const pars = { "a": 0.5 };
        const modelledSeries = "x";
        const controlODE = {};

        const solution = wodinRun(models.User, pars, 0, 10, controlODE);
        const res = wodinFitValue(solution, data, modelledSeries);
        // sum((1 + (1:6) * 0.5 - (1 + (1:6) * 4))^2)
        expect(res).toBeCloseTo(1114.75);
    });
});
