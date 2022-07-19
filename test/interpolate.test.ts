import {interpolateAlloc, interpolateCheckT, interpolateCheckY, interpolateTimes} from "../src/interpolate";

describe("Can validate interpolation argumements", () => {
    it("accepts valid inputs", () => {
        interpolateCheckY([10], [10], "x", "y");
        interpolateCheckY([10, 2, 5], [10, 2, 5], "x", "y");
    });

    it("rejects incorrectly sized vector inputs", () => {
        expect(() => interpolateCheckY([10], [9], "x", "y")).
            toThrow("Expected x to have length 10 (for y)");
        expect(() => interpolateCheckY([10, 2, 5], [9, 2, 5], "x", "y")).
            toThrow("Expected dimension 1 of x to have size 10 (for y)");
    });
});

describe("Can validate interpolation times", () => {
    it("Requires no tcrit with no interpolationTimes", () => {
        expect(interpolateCheckT(0, 10)).toBe(Infinity);
        expect(interpolateCheckT(0, 10, undefined)).toBe(Infinity);
    });

    it("Requires no tcrit with no max interpolation time", () => {
        const t = {min: 0, max: Infinity};
        expect(interpolateCheckT(0, 10, t)).toBe(Infinity);
    });

    it("Can report back tcrit from interpolation times", () => {
        const t = {min: 0, max: 11};
        expect(interpolateCheckT(0, 10, t)).toBe(11);
        expect(interpolateCheckT(0, 10, t, 10.5)).toBe(10.5);
        expect(interpolateCheckT(0, 10, t, 11.5)).toBe(11.5);
    });

    it("Requires that integration times do not extrapolate", () => {
        const t = {min: 0, max: 10};
        expect(() => interpolateCheckT(-5, 10, t))
            .toThrow("Integration times do not span interpolation range; min: 0");
        expect(() => interpolateCheckT(0, 20, t))
            .toThrow("Integration times do not span interpolation range; max: 10");
    });

    it("constructs sensible interpolation times", () => {
        expect(interpolateTimes([], [])).toEqual({min: -Infinity, max: Infinity});
        expect(interpolateTimes([3, 2, 1], [])).toEqual({min: 3, max: Infinity});
        expect(interpolateTimes([3, 2, 1], [5, 6, 7])).toEqual({min: 3, max: 5});
    });
});

describe("Can construct interpolation objects", () => {
    const t = [0, 1, 2, 3, 4, 5, 6];
    const y = t.map((x: number) => x * x);

    it("constructs constant interpolators", () => {
        const obj = interpolateAlloc("constant", t, y);
        expect(obj.eval(3, 0)).toEqual(9);
        expect(obj.eval(3.5, 0)).toEqual(9);
    });

    it("constructs linear interpolators", () => {
        const obj = interpolateAlloc("linear", t, y);
        expect(obj.eval(3, 0)).toEqual(9);
        expect(obj.eval(3.5, 0)).toEqual(12.5);
    });

    it("constructs spline interpolators", () => {
        const obj = interpolateAlloc("spline", t, y);
        expect(obj.eval(3, 0)).toEqual(9);
        expect(obj.eval(3.5, 0)).toBeCloseTo(12.2548077);
    });

    it("refuses to construct unknown interpolators", () => {
        expect(() => interpolateAlloc("other", t, y))
            .toThrow("Invalid interpolation method 'other'");
    });
});
