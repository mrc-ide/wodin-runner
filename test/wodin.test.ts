import {wodinFit, wodinRun} from "../src/wodin";
import { grid } from "../src/util";
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
        expect(y.length).toEqual(1);
        expect(y[0].name).toEqual("x");
        expect(y[0].x).toEqual(expectedT);
        expect(approxEqualArray(y[0].y, expectedX)).toBe(true);
    });

    it("runs model with output, with expected output", () => {
        const user = new Map<string, number>([["a", 1]]);
        const control : any = {};
        const solution = wodinRun(models.Output, user, 0, 10, control);

        const y = solution(0, 10, 11);
        const expectedT = grid(0, 10, 11);
        const expectedX = expectedT.map((t: number) => t + 1);
        const expectedY = expectedX.map((x: number) => x * 2);
        expect(y.length).toEqual(2);

        expect(y[0].name).toEqual("x");
        expect(y[0].x).toEqual(expectedT);
        expect(approxEqualArray(y[0].y, expectedX)).toBe(true);

        expect(y[1].name).toEqual("y");
        expect(y[1].x).toEqual(expectedT);
        expect(approxEqualArray(y[1].y, expectedY)).toBe(true);
    });

    it("runs delay model without error", () => {
        const user = new Map<string, number>();
        const control : any = {};
        const solution = wodinRun(models.Delay, user, 0, 10, control);
        const y = solution(0, 10, 11);

        const expectedT = grid(0, 10, 11);
        const expectedX = expectedT.map((t: number) => t + 1);
        const expectedY = expectedT.map((t: number) => Math.max(1, t - 1));

        expect(y.length).toEqual(2);

        expect(y[0].name).toEqual("x");
        expect(y[0].x).toEqual(expectedT);
        expect(approxEqualArray(y[0].y, expectedX)).toBe(true);

        expect(y[1].name).toEqual("y");
        expect(y[1].x).toEqual(expectedT);
        expect(approxEqualArray(y[1].y, expectedY, 1e-3)).toBe(true);
    });

    it("runs delay model without output without error", () => {
        const user = new Map<string, number>();
        const control : any = {};
        const solution = wodinRun(models.DelayNoOutput, user, 0, 10, control);
        const y = solution(0, 10, 11);

        const expectedT = grid(0, 10, 11);
        const expectedX = expectedT.map((t: number) => t + 1);
        const expectedY = [1, 2, 3, 4.5, 7, 10.5, 15, 20.5, 27, 34.5, 43];

        expect(y.length).toEqual(2);

        expect(y[0].name).toEqual("x");
        expect(y[0].x).toEqual(expectedT);
        expect(approxEqualArray(y[0].y, expectedX)).toBe(true);

        expect(y[1].name).toEqual("y");
        expect(y[1].x).toEqual(expectedT);
        expect(approxEqualArray(y[1].y, expectedY, 1e-3)).toBe(true);
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
        expect(y.length).toEqual(1);
        expect(y[0].name).toEqual("x");
        expect(y[0].x).toEqual(expectedX);
        expect(approxEqualArray(y[0].y, expectedY)).toBe(true);
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

        const yFit = res.data.solutionFit(0, 6, 7);
        expect(yFit.name).toEqual("x");
        expect(yFit.x).toEqual(time);
        expect(approxEqualArray(yFit.y, data.value)).toBe(true);

        const yFull = res.data.solutionAll(0, 6, 7);
        expect(yFull).toEqual([yFit]);
    });
});
