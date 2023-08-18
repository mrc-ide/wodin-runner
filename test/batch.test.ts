import {
    batchParsDisplace,
    batchParsRange,
    batchRun,
    computeExtremesResult,
    alignDescriptionsGetLevels,
    updatePars,
    valueAtTimeResult,
    batchPars, RunStatus
} from "../src/batch";
import { SeriesSetValues, TimeMode } from "../src/solution";
import { grid, gridLog } from "../src/util";
import { wodinRun } from "../src/wodin";

import { approxEqualArray } from "./helpers";
import { Oscillate, Output, User } from "./models";
import {UserType} from "../src";

describe("Can generate sensible sets of parameters", () => {
    it("Generates a simple sequence", () => {
        const user = { a: 1, b: 2 };
        const res = batchParsRange(user, "a", 5, false, 0, 2);
        expect(res.name).toBe("a");
        expect(res.values).toEqual(grid(0, 2, 5));
    });

    it("Generates a logarithmic sequence", () => {
        const user = { a: 1, b: 2 };
        const res = batchParsRange(user, "a", 5, true, 0.5, 1.5);
        expect(res.name).toBe("a");
        expect(res.values).toEqual(gridLog(0.5, 1.5, 5));
    });

    it("Generates a displaced sequence", () => {
        const user = { a: 1, b: 2 };
        const res = batchParsDisplace(user, "b", 5, false, 50);
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
        const p = updatePars(user, {a: 3});
        expect(p["a"]).toBe(3);
        expect(p["b"]).toBe(2);
    });

    it("Batch throws error if no varying parameters", () => {
        const pars = batchPars({a: 1}, []);
        expect(() => batchRun(Oscillate, pars, 0, 10, {}))
            .toThrow("A batch must have at least one varying parameter");
    });
});

describe("run sensitivity", () => {
    it("runs without error", () => {
        const user = { a: 2 };
        const varying = batchParsRange(user, "a", 5, false, 0, 4);
        const pars = batchPars(user, [varying]);
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
        const base = { scale: 1, shiftScale: 1, shift: 0 };
        const varying = {
            name: "scale",
            values: [0.01, 0.1, 1, 10, 100],
        };
        const pars = batchPars(base, [varying]);
        const control = {maxSteps: 100};
        const res = batchRun(Oscillate, pars, 0, 10, control);
        // This will be 2 unless we change the behaviour of dopri
        expect(res.errors.length).toEqual(2);
        expect(res.errors[0].pars["scale"]).toEqual(10);
        expect(res.errors[1].pars["scale"]).toEqual(100);
        expect(res.errors[0].error).toMatch("too many steps");

        expect(res.solutions.length).toBe(3);
        expect(res.pars.varying[0].name).toEqual("scale");
        expect(res.pars.varying[0].values).toEqual([0.01, 0.1, 1, 10, 100]);

        const expectRunStatus = (runStatus: RunStatus, pars: UserType, success: boolean, errorMatch: null | string) => {
            expect(runStatus.pars).toStrictEqual(pars);
            expect(runStatus.success).toBe(success);
            if (!errorMatch) {
                expect(runStatus.error).toBe(null);
            } else {
                expect(runStatus.error).toMatch(errorMatch);
            }
        };

        expect(res.runStatuses.length).toBe(5);
        expectRunStatus(res.runStatuses[0], { scale: 0.01 }, true, null);
        expectRunStatus(res.runStatuses[1], { scale: 0.1 }, true, null);
        expectRunStatus(res.runStatuses[2], { scale: 1 }, true, null);
        expectRunStatus(res.runStatuses[3], { scale: 10 }, false, "too many steps");
        expectRunStatus(res.runStatuses[4], { scale: 100 }, false, "too many steps");

        // Summaries also work over the reduced set of solutions
        expect(res.valueAtTime(10).x).toEqual([{scale: 0.01}, {scale: 0.1}, {scale: 1}]);
    });

    // This is very unlikely to happen in practice because we require
    // that the central solution is within the range. It might happen
    // around a point where we're on the edge of failing though and it
    // depends critically on the tolerances and number of steps.
    it("throws if all runs fail", () => {
        const pars = {
            base: { scale: 1, shiftScale: 1, shift: 0 },
            varying: [
                { name: "scale", values: [0.01, 0.1, 1, 10, 100] }
            ]
        };
        const control = {maxSteps: 1};
        // Not the world's most lovely error, but hopefully rare in practice.
        expect(() => batchRun(Oscillate, pars, 0, 10, control))
            .toThrow("All solutions failed; first error: Integration failure: too many steps");
    });

    it("can run in non-blocking mode", () => {
        const user = { a: 2 };
        const varying = batchParsRange(user, "a", 3, false, 0, 4);
        const pars = batchPars(user, [varying]);
        const control = {};
        const tStart = 0;
        const tEnd = 10;
        const obj = batchRun(User, pars, tStart, tEnd, control, false);
        expect(obj.solutions.length).toBe(0);
        expect(obj.errors.length).toBe(0);

        expect(obj.compute()).toBe(false);
        expect(obj.solutions.length).toBe(1);
        expect(obj.successfulVaryingParams).toEqual([{a: 0}]);
        expect(obj.compute()).toBe(false);
        expect(obj.solutions.length).toBe(2);
        expect(obj.successfulVaryingParams).toEqual([{a: 0}, {a: 2}]);
        expect(obj.compute()).toBe(true);
        expect(obj.solutions.length).toBe(3);
        expect(obj.compute()).toBe(true);
        expect(obj.solutions.length).toBe(3);
        expect(obj.successfulVaryingParams).toEqual([{a: 0}, {a: 2}, {a: 4}]);
    });
});

describe("run sensitivity with multiple varying parameters", () => {
    it("runs successfully with expected varying parameter combinations and results", () => {
        const base = {scale: 1, shiftScale: 1, shift: 0};
        const pars = {
            base,
            varying: [
                { name: "shiftScale", values: [1, -1] },
                { name: "shift", values: [0, 3, 5] },
            ],
        };
        const control = {maxSteps: 100};
        const res = batchRun(Oscillate, pars, 0, 10, control);
        expect(res.successfulVaryingParams).toStrictEqual([
            { shiftScale: 1, shift: 0 },
            { shiftScale: 1, shift: 3 },
            { shiftScale: 1, shift: 5 },
            { shiftScale: -1, shift: 0 },
            { shiftScale: -1, shift: 3 },
            { shiftScale: -1, shift: 5 },
        ]);
        expect(res.solutions.length).toBe(6);

        const tStart = 0;
        const tEnd = 10;
        const nPoints = 11;
        const times = { mode: TimeMode.Grid, tStart, tEnd, nPoints } as const;
        for (let index = 0; index < 6; index++) {
            const singleSln = wodinRun(Oscillate, {...base, ...res.successfulVaryingParams[index]}, tStart, tEnd, control);
            expect(res.solutions[index](times)).toStrictEqual(singleSln(times));
        }

        // Do some sanity testing that varying parameters have expected influence on results
        const valueFromSln = (slnIndex: number) => res.solutions[slnIndex](times).values[0].y[1];
        const baseValue = valueFromSln(0); // shiftScale 1, shift 0
        expect(valueFromSln(1)).toBeCloseTo(baseValue + 3, 4); // shiftScale 1, shift 3
        expect(valueFromSln(2)).toBeCloseTo(baseValue + 5, 4); // shiftScale 1, shift 5
        expect(valueFromSln(3)).toBeCloseTo(baseValue, 4); // shiftScale -1, shift 0
        expect(valueFromSln(4)).toBeCloseTo(baseValue - 3, 4); // shiftScale -1, shift 3
        expect(valueFromSln(5)).toBeCloseTo(baseValue - 5, 4); // shiftScale -1, shift 5
    });

    it("has expected results when some parameter combinations fail", () => {
        const base = {scale: 1, shiftScale: 1, shift: 0};
        const pars = {
            base,
            varying: [
                { name: "scale", values: [1, 1000] },
                { name: "shift", values: [0, 3, 5] },
            ],
        };
        const control = {maxSteps: 100};
        const res = batchRun(Oscillate, pars, 0, 10, control);
        expect(res.successfulVaryingParams).toStrictEqual([
            { scale: 1, shift: 0 },
            { scale: 1, shift: 3 },
            { scale: 1, shift: 5 }
        ]);
        expect(res.solutions.length).toBe(3);

        const tStart = 0;
        const tEnd = 10;
        const nPoints = 11;
        const times = { mode: TimeMode.Grid, tStart, tEnd, nPoints } as const;
        for (let index = 0; index < 3; index++) {
            const singleSln = wodinRun(Oscillate, {...base, ...res.successfulVaryingParams[index]}, tStart, tEnd, control);
            expect(res.solutions[index](times)).toStrictEqual(singleSln(times));
        }

        const { errors } = res;
        const expectedErr = "Integration failure: too many steps";
        expect(errors.length).toBe(3);
        expect(errors[0].pars).toStrictEqual({ scale: 1000, shift: 0});
        expect(errors[0].error).toMatch(expectedErr);
        expect(errors[1].pars).toStrictEqual({ scale: 1000, shift: 3});
        expect(errors[1].error).toMatch(expectedErr);
        expect(errors[2].pars).toStrictEqual({ scale: 1000, shift: 5});
        expect(errors[2].error).toMatch(expectedErr);
    });
});

describe("can extract from a batch result", () => {
    // TODO: we need a model with both parameters and multiple traces
    // here to confirm this is correct.
    it("Extracts state at a particular time", () => {
        const user = { a: 2 };
        const varying = batchParsRange(user, "a", 5, false, 0, 4);
        const pars = batchPars(user, [varying]);
        const control = {};
        const tStart = 0;
        const tEnd = 10;
        const obj = batchRun(User, pars, tStart, tEnd, control);
        const res = obj.valueAtTime(tEnd);
        expect(res.x.map((u) => u.a)).toEqual(grid(0, 4, 5));
        expect(res.values.length).toBe(1);
        expect(res.values[0].name).toBe("x");
        expect(approxEqualArray(res.values[0].y, [1, 11, 21, 31, 41]))
            .toBe(true);
    });

    it("Extracts state at a particular time for multivariable models", () => {
        const user = { a: 2 };
        const varying = batchParsRange(user, "a", 5, false, 0, 4);
        const pars = batchPars(user, [varying]);
        const control = {};
        const tStart = 0;
        const tEnd = 10;
        const obj = batchRun(Output, pars, tStart, tEnd, control);
        const res = obj.valueAtTime(tEnd);
        expect(res.x.map((x: UserType) => x.a)).toEqual(grid(0, 4, 5));
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

describe("valueAtTime", () => {
    it("can work with simple odin output", () => {
        const tStart = 0;
        const tEnd = 10;
        const x = [{a: 0}, {a: 1}, {a: 2}]; // parameter values
        const t = [0, 1, 2, 3, 4];
        const values = (y: number) => ({ x: t, values: [{ name: "a", y: [y] }] });
        const result = [values(4), values(5), values(6)];
        const res = valueAtTimeResult(x, result);
        expect(res.x).toStrictEqual(x);
        expect(res.values.length).toBe(1);
        expect(res.values[0].name).toBe("a");
        expect(res.values[0].y).toStrictEqual([4, 5, 6]);
    });

    it("can work with elements that have descriptions", () => {
        const tStart = 0;
        const tEnd = 10;
        const x = [{a: 0}, {a: 1}, {a: 2}]; // parameter values
        const t = [0, 1, 2, 3, 4];
        const values = (y: number) => ({ x: t, values: [{ name: "a", y: [y], description: "Mean" }] });
        const result = [values(4), values(5), values(6)];
        const res = valueAtTimeResult(x, result);
        expect(res.x).toStrictEqual(x);
        expect(res.values.length).toBe(1);
        expect(res.values[0].name).toBe("a");
        expect(res.values[0].y).toStrictEqual([4, 5, 6]);
        expect(res.values[0].description).toBe("Mean");
    });

    it("can work with multiple summaries", () => {
        const tStart = 0;
        const tEnd = 10;
        const x = [{a: 0}, {a: 1}, {a: 2}]; // parameter values
        const t = [0, 1, 2, 3, 4];
        const values = (y: number) => ({ x: t, values: [
            { name: "a", y: [y], description: "Mean" },
            { name: "a", y: [y - 0.5], description: "Min" },
            { name: "a", y: [y + 0.5], description: "Max" }
        ]});
        const result = [values(4), values(5), values(6)];
        const res = valueAtTimeResult(x, result);
        expect(res.x).toStrictEqual(x);

        expect(res.values.length).toBe(3);
        expect(res.values[0]).toStrictEqual({name: "a", description: "Mean", y: [4, 5, 6]});
        expect(res.values[1]).toStrictEqual({name: "a", description: "Min", y: [3.5, 4.5, 5.5]});
        expect(res.values[2]).toStrictEqual({name: "a", description: "Max", y: [4.5, 5.5, 6.5]});
    });

    // This is the motivating case for repairDeterministic; one
    // parameter set returns a deterministic trace but the other two
    // have both Mean and Min - we expect that our final set of
    // extremes will have Mean and Min.
    it("can work unequal multiple summaries", () => {
        const tStart = 0;
        const tEnd = 10;
        const x = [{a: 0}, {a: 1}, {a: 2}]; // parameter values
        const t = [0, 1, 2, 3, 4];
        const values = (y: number) => ({ x: t, values: [
            { name: "a", y: [y], description: "Mean" },
            { name: "a", y: [y - 0.1], description: "Min" }
        ]});
        const result = [
            {
                x: t, values: [{ name: "a", y: [4], description: "Deterministic" }]
            },
            values(5),
            values(6),
        ];
        const res = valueAtTimeResult(x, result);
        expect(res.x).toStrictEqual(x);
        expect(res.values.length).toBe(2);
        expect(res.values[0]).toStrictEqual({name: "a", description: "Mean", y: [4, 5, 6]});
        expect(res.values[1]).toStrictEqual({name: "a", description: "Min", y: [4, 4.9, 5.9]});
    });
});

describe("computeExtremes", () => {
    it("can work with simple odin output", () => {
        const x = [{ a: 0}, {a: 1}, {a: 2}]; // parameter values
        const t = [0, 1, 2, 3, 4];
        const values = (y: number[]) => ({ x: t, values: [{ name: "a", y }] });
        const result = [
            values([0, 1, 2, 3, 4]),
            values([1, 2, 3, 4, 5]),
            values([2, 3, 4, 5, 6]),
        ];
        const extremes = computeExtremesResult(x, result);
    });

    // This is the trivial dust case; one summary, copy over description
    it("can work with elements that have descriptions", () => {
        const x = [{ a: 0}, { a: 1 }, { a: 2 }]; // parameter values
        const t = [0, 1, 2, 3, 4];
        const values = (y: number[]) => ({ x: t, values: [{ name: "a", y, description: "Mean" }] });
        const result = [
            values([0, 1, 2, 3, 4]),
            values([1, 2, 3, 4, 5]),
            values([2, 3, 4, 5, 6]),
        ];
        const extremes = computeExtremesResult(x, result);

        expect(extremes.yMax.x).toStrictEqual(x);
        expect(extremes.yMax.values.length).toBe(1);
        expect(extremes.yMax.values[0]).toStrictEqual(
            { name: "a", y: [4, 5, 6], description: "Mean" });
    });

    // This is the usual dust case; we have multiple summary
    // statistics that perfectly align and we want to make sure that
    // we copy over the descriptions.
    it("can work with multiple summaries", () => {
        const x = [{ a: 0 }, { a: 1 }, { a: 2 }]; // parameter values
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
    it("can work unequal multiple summaries", () => {
        const x = [{ a: 0 }, { a: 1 }, { a: 2 }]; // parameter values
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

    it("can work with multiple series, too", () => {
        const x = [{ a: 0 }, { a: 1 }, { a: 2 }]; // parameter values
        const t = [0, 1, 2, 3, 4];
        const values = (y: number[]) => ({ x: t, values: [
            { name: "a", y, description: "Mean" },
            { name: "a", y: y.map((el) => el - 0.1), description: "Min" },
            { name: "b", y: y.map((el) => el * 3), description: "Mean" },
            { name: "b", y: y.map((el) => el * 2), description: "Min" }
        ]});
        const result = [
            {
                x: t, values: [
                    { name: "a", y: [0, 1, 2, 3, 4], description: "Deterministic" },
                    { name: "b", y: [0, 3, 6, 9, 12], description: "Deterministic" }
                ]
            },
            values([1, 2, 3, 4, 5]),
            values([2, 3, 4, 5, 6]),
        ];
        const extremes = computeExtremesResult(x, result);
        expect(extremes.yMax.x).toStrictEqual(x);
        expect(extremes.yMax.values.length).toBe(4);
        expect(extremes.yMax.values[0]).toStrictEqual(
            { name: "a", y: [4, 5, 6], description: "Mean" });
        expect(extremes.yMax.values[1]).toStrictEqual(
            { name: "a", y: [4, 4.9, 5.9], description: "Min" });
        expect(extremes.yMax.values[2]).toStrictEqual(
            { name: "b", y: [12, 15, 18], description: "Mean" });
        expect(extremes.yMax.values[3]).toStrictEqual(
            { name: "b", y: [12, 10, 12], description: "Min" });
    });

    it("recomputes when run in nonblocking mode", () => {
        const user = { a: 2 };
        const varying = batchParsRange(user, "a", 3, false, 0, 4);
        const pars = batchPars(user, [varying]);
        const control = {};
        const tStart = 0;
        const tEnd = 10;
        const obj = batchRun(User, pars, tStart, tEnd, control, false);
        expect(obj.errors.length).toBe(0);

        // Empty case succeeds:
        const e0 = obj.extreme("yMax");
        expect(e0.x).toStrictEqual([]);
        expect(e0.values).toStrictEqual([]);

        // Single case runs
        obj.compute();
        const e1 = obj.extreme("yMax");
        expect(e1.x).toStrictEqual([{a: varying.values[0]}]);
        expect(e1.values[0].y.length).toBe(1);

        // Then do the lot
        obj.run();
        const e3 = obj.extreme("yMax");
        expect(e3.x).toStrictEqual(varying.values.map((val) => ({a: val})));
        expect(e3.values[0].y.length).toBe(3);

        // Check that the single case was a subset of the full set
        expect(e3.values[0].y[0]).toBe(e1.values[0].y[0]);
    });
});

describe("can prevent issues with misshaped outputs", () => {
    const ssv = (description: string | undefined): SeriesSetValues => ({description, name: "x", y: []});

    it("handles happy cases", () => {

        expect(alignDescriptionsGetLevels([[ssv("a"), ssv("b")]])).toStrictEqual(["a", "b"]);
        expect(alignDescriptionsGetLevels([[ssv("a"), ssv("b")], [ssv("a"), ssv("b")]])).toStrictEqual(["a", "b"]);
        expect(alignDescriptionsGetLevels(Array(4).fill([ssv("a"), ssv("b")]))).toStrictEqual(["a", "b"]);
        expect(alignDescriptionsGetLevels([[ssv("x")], [ssv("a"), ssv("b")]])).toStrictEqual(["a", "b"]);
        expect(alignDescriptionsGetLevels([[ssv(undefined)], [ssv("a"), ssv("b")]])).toStrictEqual(["a", "b"]);
    });

    it("prevents mix of undefined and labeled descriptions", () => {
        expect(() => alignDescriptionsGetLevels([[ssv("a"), ssv(undefined)]]))
            .toThrow("Expected all descriptions to be defined");
        expect(() => alignDescriptionsGetLevels([[ssv("a"), ssv(undefined), ssv("b")]]))
            .toThrow("Expected all descriptions to be defined");
    });

    it("ensures consistency of unreplicated series", () => {
        expect(() => alignDescriptionsGetLevels([[ssv("a")], [ssv("b")]]))
            .toThrow("Unexpected inconsistent descriptions: have a, but given b");
        expect(() => alignDescriptionsGetLevels([[ssv("a")], [ssv(undefined)]]))
            .toThrow("Unexpected inconsistent descriptions: have a, but given undefined");
    });

    it("ensures consistency of replicated series", () => {
        expect(() => alignDescriptionsGetLevels([[ssv("a"), ssv("b")], [ssv("b"), ssv("a")]]))
            .toThrow("Unexpected inconsistent descriptions: have [a, b], but given [b, a]");
        expect(() => alignDescriptionsGetLevels([[ssv("a"), ssv("b")], [ssv("a"), ssv("b"), ssv("c")]]))
            .toThrow("Unexpected inconsistent descriptions: have [a, b], but given [a, b, c]");
    });
});
