import {PkgWrapper} from "../src/pkg";

import * as models from "./models";
import {approxEqualArray} from "./helpers";

describe("wrapper", () => {
    it("Can create a simple wrapped model", () => {
        const user = new Map<string, number>();
        const control : any = {};
        const mod = new PkgWrapper(models.Minimal, user, "error");

        expect(mod.initial(0)).toEqual([1]);
        expect(mod.rhs(0, [1])).toEqual({"output": null, "state": [1]});
        expect(mod.getMetadata()).toEqual({});
        const internal = mod.getInternal();
        expect(internal.a).toEqual(1);
        const result = mod.run([0, 1, 2, 3], null, control);
        expect(result.y).toEqual([[1], [2], [3], [4]]);
        expect(result.names).toEqual(["x"]);
        expect(result.statistics.nEval).toBeGreaterThan(10);
    });

    it("Can run the rhs with output", () => {
        const user = new Map<string, number>([["a", 1]]);
        const control : any = {};
        const mod = new PkgWrapper(models.Output, user, "error");
        expect(mod.rhs(0, [1])).toEqual({"output": [2], "state": [1]});
    });

    it("Refuses to run rhs for dde models", () => {
        const user = new Map<string, number>();
        const control : any = {};
        const mod = new PkgWrapper(models.Delay, user, "error");
        expect(() => mod.rhs(0, [0])).toThrow(
            "Can't use rhs() with delay models");
    });

    it("Can override the initial conditions", () => {
        const user = new Map<string, number>();
        const control : any = {};
        const mod = new PkgWrapper(models.Minimal, user, "error");

        const t = [0, 1, 2, 3, 4]
        const result = mod.run(t, [2], control);

        const y = result.y.map((el: number[]) => el[0]);
        expect(approxEqualArray(y, [2, 3, 4, 5, 6])).toBe(true);
    })
});
