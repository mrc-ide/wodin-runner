import { batchParsDisplace, batchParsRange, batchRun, computeExtremesResult, updatePars } from "../src/batch";
import { TimeMode } from "../src/solution";
import { grid, gridLog } from "../src/util";
import { wodinRun } from "../src/wodin";

import { approxEqualArray } from "./helpers";
import { Oscillate, Output, User } from "./models";

describe("Can generate sensible sets of parameters", () => {
    it("Generates a simple sequence", () => {
        const user = { a: 1, b: 2 };
        const res = batchParsRange(user, "a", 5, false, 0, 2);
        expect(res.base).toBe(user);
        expect(res.name).toBe("a");
        expect(res.values).toEqual(grid(0, 2, 5));
    });

    it("Generates a logarithmic sequence", () => {
        const user = { a: 1, b: 2 };
        const res = batchParsRange(user, "a", 5, true, 0.5, 1.5);
        expect(res.base).toBe(user);
        expect(res.name).toBe("a");
        expect(res.values).toEqual(gridLog(0.5, 1.5, 5));
    });

    it("Generates a displaced sequence", () => {
        const user = { a: 1, b: 2 };
        const res = batchParsDisplace(user, "b", 5, false, 50);
        expect(res.base).toBe(user);
        expect(res.name).toBe("b");
        expect(res.values).toEqual(grid(1, 3, 5));
    });

    it("Requires that central values lie within the requested range", () => {
        const user = { a: 1, b: 2 };
        expect(() => batchParsRange(user, "a", 5, false, 3, 4))
            .toThrow("Expected lower bound to be no greater than 1");
        expect(() => batchParsRange(user, "a", 5, false, -2, -1))
            .toThrow("Expected upper bound to be no less than 1");
        expect(() => batchParsRange(user, "a", 5, false, 1, 1))
            .toThrow("Expected upper bound to be greater than lower bound");
    });

    it("Requires that we have at least two points in the range", () => {
        const user = { a: 1, b: 2 };
        expect(() => batchParsRange(user, "a", 1, false, 0, 2))
            .toThrow("Must include at least 2 traces in the batch");
    });

    it("Requires that the updated parameter exists", () => {
        const user = { a: 1, b: 2 };
        expect(() => batchParsRange(user, "c", 5, false, 0, 2))
            .toThrow("Expected a value for 'c'");
    });

    it("Requires a scalar for the updated parameter", () => {
        const user = { a: [1, 2] };
        expect(() => batchParsRange(user, "a", 5, false, 0, 2))
            .toThrow("Expected a number for 'a'");
    });

    it("Requires that log scaled values have strictly positive lower bound", () => {
        const user = { a: 1, b: 2 };
        expect(() => batchParsRange(user, "a", 5, true, 0, 1.5))
            .toThrow("Lower bound must be greater than 0 for logarithmic scale");
    });

    it("Updates parameter values correctly", () => {
        const user = { a: 1, b: 2 };
        const p = updatePars(user, "a", 3);
        expect(p["a"]).toBe(3);
        expect(p["b"]).toBe(2);
    });
});

describe("run sensitivity", () => {
    it("runs without error", () => {
        const user = { a: 2 };
        const pars = batchParsRange(user, "a", 5, false, 0, 4);
        const control = {};
        const tStart = 0;
        const tEnd = 10;
        const res = batchRun(User, pars, tStart, tEnd, control);

        const central = wodinRun(User, user, tStart, tEnd, control);
        const lower = wodinRun(User, { a: 0 }, tStart, tEnd, control);
        const upper = wodinRun(User, { a: 4 }, tStart, tEnd, control);
        const nPoints = 11;
        const times = { mode: TimeMode.Grid, tStart, tEnd, nPoints } as const;
        expect(res.solutions[2](times))
            .toEqual(central(times));
        expect(res.solutions[0](times))
            .toEqual(lower(times));
        expect(res.solutions[4](times))
            .toEqual(upper(times));
    });

    it("catches errors in fraction of runs", () => {
        const pars = {
            base: { scale: 1 },
            name: "scale",
            values: [0.01, 0.1, 1, 10, 100],
        };
        const control = {maxSteps: 100};
        const res = batchRun(Oscillate, pars, 0, 10, control);
        // This will be 2 unless we change the behaviour of dopri
        expect(res.errors.length).toEqual(2);
        expect(res.errors[0].value).toEqual(10);
        expect(res.errors[1].value).toEqual(100);
        expect(res.errors[0].error).toMatch("too many steps");

        expect(res.solutions.length).toBe(3);
        expect(res.pars.values).toEqual([0.01, 0.1, 1]);

        // Summaries also work over the reduced set of solutions
        expect(res.valueAtTime(10).x.length).toEqual(3);
    });

    // This is very unlikely to happen in practice because we require
    // that the central solution is within the range. It might happen
    // around a point where we're on the edge of failing though and it
    // depends critically on the tolerances and number of steps.
    it("throws if all runs fail", () => {
        const pars = {
            base: { scale: 1 },
            name: "scale",
            values: [0.01, 0.1, 1, 10, 100],
        };
        const control = {maxSteps: 1};
        // Not the world's most lovely error, but hopefully rare in practice.
        expect(() => batchRun(Oscillate, pars, 0, 10, control))
            .toThrow("All solutions failed; first error: Integration failure: too many steps");
    });

    it("can run in non-blocking mode", () => {
        const user = { a: 2 };
        const pars = batchParsRange(user, "a", 3, false, 0, 4);
        const control = {};
        const tStart = 0;
        const tEnd = 10;
        const obj = batchRun(User, pars, tStart, tEnd, control, false);
        expect(obj.solutions.length).toBe(0);
        expect(obj.errors.length).toBe(0);

        expect(obj.compute()).toBe(false);
        expect(obj.solutions.length).toBe(1);
        expect(obj.pars.values).toEqual([0]);
        expect(obj.compute()).toBe(false);
        expect(obj.solutions.length).toBe(2);
        expect(obj.pars.values).toEqual([0, 2]);
        expect(obj.compute()).toBe(true);
        expect(obj.solutions.length).toBe(3);
        expect(obj.compute()).toBe(true);
        expect(obj.solutions.length).toBe(3);
        expect(obj.pars.values).toEqual([0, 2, 4]);
    })
});

describe("can extract from a batch result", () => {
    // TODO: we need a model with both parameters and multiple traces
    // here to confirm this is correct.
    it("Extracts state at a particular time", () => {
        const user = { a: 2 };
        const pars = batchParsRange(user, "a", 5, false, 0, 4);
        const control = {};
        const tStart = 0;
        const tEnd = 10;
        const obj = batchRun(User, pars, tStart, tEnd, control);
        const res = obj.valueAtTime(tEnd);
        expect(res.x).toEqual(grid(0, 4, 5));
        expect(res.values.length).toBe(1);
        expect(res.values[0].name).toBe("x");
        expect(approxEqualArray(res.values[0].y, [1, 11, 21, 31, 41]))
            .toBe(true);
    });

    it("Extracts state at a particular time for multivariable models", () => {
        const user = { a: 2 };
        const pars = batchParsRange(user, "a", 5, false, 0, 4);
        const control = {};
        const tStart = 0;
        const tEnd = 10;
        const obj = batchRun(Output, pars, tStart, tEnd, control);
        const res = obj.valueAtTime(tEnd);
        expect(res.x).toEqual(grid(0, 4, 5));
        expect(res.values.length).toBe(2);
        expect(res.values[0].name).toBe("x");
        expect(approxEqualArray(res.values[0].y, [1, 11, 21, 31, 41]))
            .toBe(true);
        expect(res.values[1].name).toBe("y");
        expect(approxEqualArray(res.values[1].y, [2, 22, 42, 62, 82]))
            .toBe(true);
        const e = obj.extreme("yMax");
        expect(e.x).toEqual(res.x);
        expect(e.values.length).toBe(2);
        expect(e.values[0].name).toBe("x");
        expect(e.values[1].name).toBe("y");
        expect(approxEqualArray(e.values[0].y, [1, 11, 21, 31, 41])).toBe(true);
        expect(approxEqualArray(e.values[1].y, [2, 22, 42, 62, 82])).toBe(true);
    });
});

// npm run test -- --watch --verbose=false --coverage=false test/batch.test.ts
describe("new", () => {
    it("new", () => {
        const tStart = 0;
        const tEnd = 10;
        const x = [0, 1, 2]; // parameter values
        const t = [0, 1, 2, 3, 4];
        const values = (y: number[]) => ({ x: t, values: [{ name: "a", y }] });
        const result = [
            values([0, 1, 2, 3, 4]),
            values([1, 2, 3, 4, 5]),
            values([2, 3, 4, 5, 6]),
        ];
        // console.log(result);
        // console.log(result[0]);
        const extremes = computeExtremesResult(x, result);
        // console.log(extremes);
        // console.log(extremes.tMin);
        // console.log(extremes.tMin.values[0]);
    });

    // This is the trivial dust case; one summary, copy over description
    it("can work with elements that have descriptions", () => {
        const tStart = 0;
        const tEnd = 10;
        const x = [0, 1, 2]; // parameter values
        const t = [0, 1, 2, 3, 4];
        const values = (y: number[]) => ({ x: t, values: [{ name: "a", y, description: "Mean" }] });
        const result = [
            values([0, 1, 2, 3, 4]),
            values([1, 2, 3, 4, 5]),
            values([2, 3, 4, 5, 6]),
        ];
        const extremes = computeExtremesResult(x, result);
        console.log(extremes);
        console.log(extremes.yMax);
        console.log(extremes.yMax.values[0]);

        expect(extremes.yMax.x).toStrictEqual(x);
        expect(extremes.yMax.values.length).toBe(1);
        expect(extremes.yMax.values[0]).toStrictEqual(
            { name: "a", y: [4, 5, 6], description: "Mean" });
    });

    // This is the usual dust case; we have multiple summary
    // statistics that perfectly align and we want to make sure that
    // we copy over the descriptions.
    it.only("can work with multiple summaries", () => {
        const tStart = 0;
        const tEnd = 10;
        const x = [0, 1, 2]; // parameter values
        const t = [0, 1, 2, 3, 4];
        const values = (y: number[]) => ({ x: t, values: [
            { name: "a", y, description: "Mean" },
            { name: "a", y: y.map((el) => el - 0.5), description: "Min" },
            { name: "a", y: y.map((el) => el + 0.5), description: "Max" }
        ]});
        const result = [
            values([0, 1, 2, 3, 4]),
            values([1, 2, 3, 4, 5]),
            values([2, 3, 4, 5, 6]),
        ];
        const extremes = computeExtremesResult(x, result);
        expect(extremes.yMax.x).toStrictEqual(x);
        expect(extremes.yMax.values.length).toBe(3);
        expect(extremes.yMax.values[0]).toStrictEqual(
            { name: "a", y: [4, 5, 6], description: "Mean" });
        expect(extremes.yMax.values[1]).toStrictEqual(
            { name: "a", y: [3.5, 4.5, 5.5], description: "Min" });
        expect(extremes.yMax.values[2]).toStrictEqual(
            { name: "a", y: [4.5, 5.5, 6.5], description: "Max" });
    });

    // This is the motivating case for repairDeterministic; one
    // parameter set returns a deterministic trace but the other two
    // have both Mean and Min - we expect that our final set of
    // extremes will have Mean and Min.
    it("can work with elements that have descriptions", () => {
        const tStart = 0;
        const tEnd = 10;
        const x = [0, 1, 2]; // parameter values
        const t = [0, 1, 2, 3, 4];
        const values = (y: number[]) => ({ x: t, values: [
            { name: "a", y, description: "Mean" },
            { name: "a", y: y.map((el) => el - 0.1), description: "Min" }
        ]});
        const result = [
            {
                x: t, values: [{
                    name: "a",
                    y: [0, 1, 2, 3, 4],
                    description: "Deterministic"
                }]
            },
            values([1, 2, 3, 4, 5]),
            values([2, 3, 4, 5, 6]),
        ];
        const extremes = computeExtremesResult(x, result);
        expect(extremes.yMax.x).toStrictEqual(x);
        expect(extremes.yMax.values.length).toBe(2);
        expect(extremes.yMax.values[0]).toStrictEqual(
            { name: "a", y: [4, 5, 6], description: "Mean" });
        expect(extremes.yMax.values[1]).toStrictEqual(
            { name: "a", y: [4, 4.9, 5.9], description: "Min" });
    });
});
