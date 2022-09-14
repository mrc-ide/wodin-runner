import * as models from "./models";
import {fitTarget, sumOfSquares} from "../src/fit";
import {grid} from "../src/util";
import {UserValue} from "../src/user";

import {approxEqualArray} from "./helpers";

describe("sumOfSquares", () => {
    const x = [1, 2, 3, 4, 5, 6];
    it("is zero where no difference", () => {
        expect(sumOfSquares(x, x)).toEqual(0);
    });

    it("calculates as expected", () => {
        const y = [6, 5, 4, 3, 2, 1];
        expect(sumOfSquares(x, y)).toEqual(70);
    });

    it("allows missing values", () => {
        expect(sumOfSquares([2, 3, NaN, 5, 6, 7], x)).toEqual(5);
        expect(sumOfSquares(Array(6).fill(NaN), x)).toEqual(0);
    });
})

describe("fitTarget", () => {
    it("requires that the first time is at least zero", () => {
        const time = [-1, 0, 1, 2, 3, 4, 5];
        const data = {time, value: time.map((t: number) => 1 + t * 4)}
        const pars = { base: { "a": 0.5 }, vary: ["a"] };
        const modelledSeries = "x";
        const control = {};
        expect(() => fitTarget(models.User, data, pars, modelledSeries, control))
            .toThrow("Expected the first time to be at least 0");
    });

    it("if time is nonzero, model run includes zero", () => {
        const time = [1, 2, 3, 4, 5];
        const data = {time, value: time.map((t: number) => 1 + t * 4)}
        const pars = { base: { "a": 0.5 }, vary: ["a"] };
        const modelledSeries = "x";
        const control = {};
        const target = fitTarget(models.User, data, pars, modelledSeries, control);
        const res = target([0.5]);
        const sol = res.data.solution({ mode: "grid", tStart: 0, tEnd: 5, nPoints: 6 });
        const expectedX = grid(0, 5, 6);
        const expectedY = expectedX.map((el) => 1 + el * 0.5);
        expect(sol.x).toStrictEqual(expectedX);
        expect(approxEqualArray(sol.y[0], expectedY)).toBe(true);
    });
});
