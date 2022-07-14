import { batchParsDisplace, batchParsRange } from "../src/batch";
import { grid, gridLog } from "../src/util";

describe("Can generate sensible sets of parameters", () => {
    it("Generates a simple sequence", () => {
        const user = new Map<string, number>([["a", 1], ["b", 2]]);
        const res = batchParsRange(user, "a", 5, false, 0, 2);
        expect(res.base).toBe(user);
        expect(res.name).toBe("a");
        expect(res.values).toEqual(grid(0, 2, 5));
    });

    it("Generates a logarithmic sequence", () => {
        const user = new Map<string, number>([["a", 1], ["b", 2]]);
        const res = batchParsRange(user, "a", 5, true, 0.5, 1.5);
        expect(res.base).toBe(user);
        expect(res.name).toBe("a");
        expect(res.values).toEqual(gridLog(0.5, 1.5, 5));
    });

    it("Generates a displaced sequence", () => {
        const user = new Map<string, number>([["a", 1], ["b", 2]]);
        const res = batchParsDisplace(user, "b", 5, false, 50);
        expect(res.base).toBe(user);
        expect(res.name).toBe("b");
        expect(res.values).toEqual(grid(1, 3, 5));
    });

    it("Requires that central values lie within the requested range", () => {
        const user = new Map<string, number>([["a", 1], ["b", 2]]);
        expect(() => batchParsRange(user, "a", 5, false, 3, 4))
            .toThrow("Expected lower bound to be no greater than 1");
        expect(() => batchParsRange(user, "a", 5, false, -2, -1))
            .toThrow("Expected upper bound to be no less than 1");
        expect(() => batchParsRange(user, "a", 5, false, 1, 1))
            .toThrow("Expected upper bound to be greater than lower bound");
    })

    it("Requires that we have at least two points in the range", () => {
        const user = new Map<string, number>([["a", 1], ["b", 2]]);
        expect(() => batchParsRange(user, "a", 1, false, 0, 2))
            .toThrow("Must include at least 2 traces in the batch");
    });
});
