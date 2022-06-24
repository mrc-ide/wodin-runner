import {InternalStorage, UserTensor, UserValue, checkUser, setUserScalar, setUserArrayFixed, setUserArrayVariable} from "../src/user";

describe("checkUser", () => {
    const pars = new Map<string, UserValue>([["a", 1], ["b", 2], ["c", 3]]);
    it("does no checking if ignored", () => {
        checkUser(pars, [], "ignore");
    });

    it("messages if unknown keys found", () => {
        console.log = jest.fn();
        checkUser(pars, ["a", "b"], "message");
        expect(console.log)
            .toHaveBeenCalledWith("Unknown user parameters: c");
        checkUser(pars, ["b"], "message");
        expect(console.log)
            .toHaveBeenCalledWith("Unknown user parameters: a, c");
    })

    it("warns if unknown keys found", () => {
        console.warn = jest.fn();
        checkUser(pars, ["a", "b"], "warning");
        expect(console.warn)
            .toHaveBeenCalledWith("Unknown user parameters: c");
    })

    it("error if unknown keys found", () => {
        expect(() => checkUser(pars, ["a", "b"], "stop"))
            .toThrow("Unknown user parameters: c");
        expect(() => checkUser(pars, ["b"], "stop"))
            .toThrow("Unknown user parameters: a, c");
        expect(() => checkUser(pars, ["a", "b", "c"], "stop"))
            .not.toThrow();
    })

    it("errors if invalid option given", () => {
        expect(() => checkUser(pars, ["a", "b"], "throw"))
            .toThrow("Unknown user parameters: c (and invalid value for unusedUserAction)");
        expect(() => checkUser(pars, ["a", "b", "c"], "throw"))
            .not.toThrow();
    })
});

describe("setUserScalar", () => {
    const pars = new Map<string, UserValue>([["a", 1], ["b", 2.5], ["c", 3]]);
    it("Can retrieve a user value", () => {
        const internal = {} as InternalStorage;
        setUserScalar(pars, "a", internal, null, -Infinity, Infinity, false);
        expect(internal["a"]).toEqual(1);
    });

    it("Can fall back on default value, erroring if unavailable", () => {
        const internal = {} as InternalStorage;
        expect(() => setUserScalar(pars, "d", internal, null, -Infinity, Infinity, false))
            .toThrow("Expected a value for 'd'");
        setUserScalar(pars, "d", internal, 1, -Infinity, Infinity, false);
    });

    it("Can validate that the provided value satisfies constraints", () => {
        const internal = {} as InternalStorage;
        setUserScalar(pars, "a", internal, null, 0, 2, false);
        expect(internal["a"]).toEqual(1);
        expect(() => setUserScalar(pars, "a", internal, null, 2, 4, false))
            .toThrow("Expected 'a' to be at least 2");
        expect(() => setUserScalar(pars, "a", internal, null, -2, 0, false))
            .toThrow("Expected 'a' to be at most 0");
        expect(() => setUserScalar(pars, "b", internal, null, -Infinity, Infinity, true))
            .toThrow("Expected 'b' to be integer-like");
    });

    it("Errors if given something other than a number", () => {
        const pars = new Map<string, UserValue>([["a", [1, 2, 3]]]);
        const internal = {} as InternalStorage;
        expect(() => setUserScalar(
            pars, "a", internal, null, -Infinity, Infinity, false))
            .toThrow("Expected a number for 'a'");
    });
});

describe("setUserArrayFixed", () => {
    const pars = new Map<string, UserValue>([
        ["a", 1],
        ["b", [1, 2, 3]],
        ["c", {data: [1, 2, 3], dim: [3]}],
        ["d", {data: [1, 2, 3, 4, 5, 6], dim: [2, 3]}],
        ["e", {data: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], dim: [2, 3, 2]}]
    ]);
    it("Can retrieve a user array from a scalar", () => {
        const internal = {} as InternalStorage;
        setUserArrayFixed(pars, "a", internal, [1, 1],
                          -Infinity, Infinity, false);
        expect(internal["a"]).toEqual([1]);
    });
    it("Can retrieve a user array from an array", () => {
        const internal = {} as InternalStorage;
        setUserArrayFixed(pars, "b", internal, [3, 3],
                          -Infinity, Infinity, false);
        expect(internal["b"]).toEqual([1, 2, 3]);
    });
    it("Can retrieve a user array from a tensor", () => {
        const internal = {} as InternalStorage;
        setUserArrayFixed(pars, "c", internal, [3, 3],
                          -Infinity, Infinity, false);
        expect(internal["c"]).toEqual([1, 2, 3]);
    });
    it("Can retrieve a user matrix from a tensor", () => {
        const internal = {} as InternalStorage;
        setUserArrayFixed(pars, "d", internal, [6, 2, 3],
                          -Infinity, Infinity, false);
        expect(internal["d"]).toEqual([1, 2, 3, 4, 5, 6]);
    });
    it("Can retrieve a user 3d array from a tensor", () => {
        const internal = {} as InternalStorage;
        setUserArrayFixed(pars, "e", internal, [12, 2, 3, 2],
                          -Infinity, Infinity, false);
        expect(internal["e"]).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    });
    it("Errors if a value is not found", () => {
        const internal = {} as InternalStorage;
        expect(() => setUserArrayFixed(
            pars, "x", internal, [3, 3], -Infinity, Infinity, false))
            .toThrow("Expected a value for 'x'");
    });
    it("Errors if provided with the wrong rank", () => {
        const internal = {} as InternalStorage;
        expect(() => setUserArrayFixed(
            pars, "d", internal, [3, 3], -Infinity, Infinity, false))
            .toThrow("Expected a numeric vector for 'd'");
        expect(() => setUserArrayFixed(
            pars, "c", internal, [6, 2, 3], -Infinity, Infinity, false))
            .toThrow("Expected a numeric matrix for 'c'");
        expect(() => setUserArrayFixed(
            pars, "d", internal, [12, 2, 3, 2], -Infinity, Infinity, false))
            .toThrow("Expected a numeric array of rank 3 for 'd'");
    });
    it("Errors if provided with the wrong size", () => {
        const internal = {} as InternalStorage;
        expect(() => setUserArrayFixed(
            pars, "b", internal, [4, 4], -Infinity, Infinity, false))
            .toThrow("Expected length 4 value for 'b'");
        expect(() => setUserArrayFixed(
            pars, "d", internal, [10, 2, 5], -Infinity, Infinity, false))
            .toThrow("Incorrect size of dimension 2 of 'd' (expected 5)");
        expect(() => setUserArrayFixed(
            pars, "d", internal, [12, 4, 3], -Infinity, Infinity, false))
            .toThrow("Incorrect size of dimension 1 of 'd' (expected 4)");
    });
    it("Errors if values are out of range", () => {
        const internal = {} as InternalStorage;
        expect(() => setUserArrayFixed(
            pars, "c", internal, [3, 3], 2, Infinity, false))
            .toThrow("Expected 'c' to be at least 2");
        expect(() => setUserArrayFixed(
            pars, "c", internal, [3, 3], -Infinity, 2, false))
            .toThrow("Expected 'c' to be at most 2");
    });

    it("Can prevent missing values", () => {
        const internal = {} as InternalStorage;
        const pars = new Map<string, UserValue>([
            ["x", {data: [1, 2, null as any], dim: [3]}]
        ]);
        expect(() => setUserArrayFixed(
            pars, "x", internal, [3, 3], -Infinity, Infinity, false))
            .toThrow("'x' must not contain any NA values");
    });
});

describe("setUserArrayFixed", () => {
    const pars = new Map<string, UserValue>([
        ["a", 1],
        ["b", [1, 2, 3]],
        ["c", {data: [1, 2, 3], dim: [3]}],
        ["d", {data: [1, 2, 3, 4, 5, 6], dim: [2, 3]}],
        ["e", {data: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], dim: [2, 3, 2]}]
    ]);
    it("Can fetch a variable and save sizes", () => {
        const size = [0, 0, 0];
        const internal = {} as InternalStorage;
        setUserArrayVariable(pars, "d", internal, size,
                             -Infinity, Infinity, false);
        expect(internal.d).toEqual([1, 2, 3, 4, 5, 6]);
        expect(size).toEqual([6, 2, 3]);
    })
    it("Errors if a value is not found", () => {
        const internal = {} as InternalStorage;
        const size = [0, 0];
        expect(() => setUserArrayVariable(
            pars, "x", internal, size, -Infinity, Infinity, false))
            .toThrow("Expected a value for 'x'");
    });
});
