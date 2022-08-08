import { wodinFit, wodinFitBaseline, wodinRun } from "../src/wodin";
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
        const user = new Map<string, number>();
        const control : any = {};
        const solution = wodinRun(models.Minimal, user, 0, 10, control);

        const y = solution(0, 10, 11);
        const expectedT = grid(0, 10, 11);
        const expectedX = expectedT.map((t: number) => t + 1);
        expect(y.names).toEqual(["x"]);
        expect(y.x).toEqual(expectedT);
        expect(y.y.length).toBe(1);
        expect(approxEqualArray(y.y[0], expectedX)).toBe(true);
    });

    it("runs model with output, with expected output", () => {
        const user = new Map<string, number>([["a", 1]]);
        const control : any = {};
        const solution = wodinRun(models.Output, user, 0, 10, control);

        const y = solution(0, 10, 11);
        const expectedT = grid(0, 10, 11);
        const expectedX = expectedT.map((t: number) => t + 1);
        const expectedY = expectedX.map((x: number) => x * 2);

        expect(y.names).toEqual(["x", "y"]);
        expect(y.x).toEqual(expectedT);
        expect(approxEqualArray(y.y[0], expectedX)).toBe(true);
        expect(approxEqualArray(y.y[1], expectedY)).toBe(true);
    });

    it("runs delay model without error", () => {
        const user = new Map<string, number>();
        const control : any = {};
        const solution = wodinRun(models.Delay, user, 0, 10, control);
        const y = solution(0, 10, 11);

        const expectedT = grid(0, 10, 11);
        const expectedX = expectedT.map((t: number) => t + 1);
        const expectedY = expectedT.map((t: number) => Math.max(1, t - 1));

        expect(y.names).toEqual(["x", "y"]);
        expect(y.x).toEqual(expectedT);
        expect(approxEqualArray(y.y[0], expectedX)).toBe(true);
        expect(approxEqualArray(y.y[1], expectedY, 1e-3)).toBe(true);
    });

    it("runs delay model without output without error", () => {
        const user = new Map<string, number>();
        const control : any = {};
        const solution = wodinRun(models.DelayNoOutput, user, 0, 10, control);
        const y = solution(0, 10, 11);

        const expectedT = grid(0, 10, 11);
        const expectedX = expectedT.map((t: number) => t + 1);
        const expectedY = [1, 2, 3, 4.5, 7, 10.5, 15, 20.5, 27, 34.5, 43];

        expect(y.names).toEqual(["x", "y"]);
        expect(y.x).toEqual(expectedT);
        expect(approxEqualArray(y.y[0], expectedX)).toBe(true);
        expect(approxEqualArray(y.y[1], expectedY, 1e-3)).toBe(true);
    });

    it("runs a model with interpolation", () => {
        const pi = Math.PI;
        const tp = grid(0, pi, 31);
        const zp = tp.map((t: number) => Math.sin(t));
        const user = new Map<string, number | number[]>([["tp", tp], ["zp", zp]]);
        const control : any = {};
        const solution = wodinRun(models.InterpolateSpline, user, 0, pi, control);

        const expectedT = grid(0, pi, 11);
        const expectedY = expectedT.map((t: number) => 1 - Math.cos(t));
        const y = solution(0, pi, 11);
        expect(approxEqualArray(y.y[0], expectedY, 1e-4)).toBe(true);
    });

    it("runs a model with interpolated arrays", () => {
        const tp = [0, 1, 2];
        const zp: UserTensor = {data: [0, 1, 0, 0, 2, 0], dim: [3, 2]};
        const user = new Map<string, UserValue>([["tp", tp], ["zp", zp]]);
        const control: any = {};
        const solution = wodinRun(models.InterpolateArray, user, 0, 3, control);
        const y = solution(0, 3, 51);
        const t = y.x;
        const z1 = t.map((t: number) => t < 1 ? 0 : (t > 2 ? 1 : t - 1));
        const z2 = t.map((t: number) => t < 1 ? 0 : (t > 2 ? 2 : 2 * (t - 1)));
        expect(approxEqualArray(y.y[0], z1, 6e-5)).toBe(true);
        expect(approxEqualArray(y.y[1], z2, 6e-5)).toBe(true);
    });
});

describe("can set user", () => {
    it("Agrees with mininal model", () => {
        const pars1 = new Map<string, number>();
        const pars2 = new Map<string, number>([["a", 1]]);
        const control : any = {};
        const solution1 = wodinRun(models.Minimal, pars1, 0, 10, control);
        const solution2 = wodinRun(models.User, pars2, 0, 10, control);
        const y1 = solution1(0, 10, 11);
        const y2 = solution2(0, 10, 11);
        expect(y1).toEqual(y2);
    });

    it("Can pick up default values", () => {
        const pars1 = new Map<string, number>();
        const pars2 = new Map<string, number>([["a", 1]]);
        const control : any = {};
        const solution1 = wodinRun(models.User, pars1, 0, 10, control);
        const solution2 = wodinRun(models.User, pars2, 0, 10, control);
        const y1 = solution1(0, 10, 11);
        const y2 = solution2(0, 10, 11);
        expect(y1).toEqual(y2);
    });

    it("Varies by changing parameters", () => {
        const pars = new Map<string, number>([["a", 2]]);
        const control : any = {};
        const solution = wodinRun(models.User, pars, 0, 10, control);
        const y = solution(0, 10, 11);
        const expectedX = grid(0, 10, 11);
        const expectedY = expectedX.map((t: number) => t * 2 + 1);
        expect(y.names).toEqual(["x"]);
        expect(y.x).toEqual(expectedX);
        expect(approxEqualArray(y.y[0], expectedY)).toBe(true);
    })
});

describe("can fit a simple line", () => {
    it("Can fit a simple model", () => {
        const time = [0, 1, 2, 3, 4, 5, 6];
        const data = {time, value: time.map((t: number) => 1 + t * 4)}
        const pars = {base: new Map<string, number>([["a", 0.5]]),
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
        expect(res.data.pars.get("a")).toEqual(res.location[0]);

        const yFit = res.data.solution(0, 6, 7);
        expect(yFit.names).toEqual(["x"]);
        expect(yFit.x).toEqual(time);
        expect(approxEqualArray(yFit.y[0], data.value)).toBe(true);
    });

    it("Can fit a simple model with missing data", () => {
        const time = [0, 1, 2, 3, 4, 5, 6];
        const data = {time, value: time.map((t: number) => 1 + t * 4)}
        data.value[3] = NaN;
        const pars = {base: new Map<string, number>([["a", 0.5]]),
                      vary: ["a"]};
        const opt = wodinFit(models.User, data, pars, "x", {}, {});
        const res = opt.run(100);
        expect(res.converged).toBe(true);
        expect(res.location[0]).toBeCloseTo(4);
    });
});

describe("can run a baseline", () => {
    it("Can fit a simple model", () => {
        const time = [0, 1, 2, 3, 4, 5, 6];
        const data = {time, value: time.map((t: number) => 1 + t * 4)}
        const pars = new Map<string, number>([["a", 0.5]]);
        const modelledSeries = "x";
        const controlODE = {};
        const res = wodinFitBaseline(models.User, data, pars, modelledSeries,
                                     controlODE);
        // sum((1 + (1:6) * 0.5 - (1 + (1:6) * 4))^2)
        expect(res.value).toBeCloseTo(1114.75);
        expect(res.data.names).toEqual(["x"]);
        expect(res.data.pars).toEqual(pars);

        const yFit = res.data.solution(0, 6, 7);
        expect(yFit.names).toEqual(["x"]);
        expect(yFit.x).toEqual(time);
        expect(yFit.y[0]).toEqual([1, 1.5, 2, 2.5, 3, 3.5, 4]);
    });
});
