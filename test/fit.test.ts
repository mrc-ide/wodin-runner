import * as models from "./models";
import {fitTarget, startFit, sumOfSquares} from "../src/fit";
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
})


describe("can fit a simple line", () => {
    it("Can fit a simple model", () => {
        const time = [0, 1, 2, 3, 4, 5, 6];
        const data = {time, value: time.map((t: number) => 1 + t * 4)}
        const pars = {base: new Map<string, UserValue>([["a", 0.5]]),
                      vary: ["a"]};
        const modelledSeries = "x";
        const controlODE = {};
        const controlFit = {};

        const opt = startFit(models.User, data, pars, modelledSeries,
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
