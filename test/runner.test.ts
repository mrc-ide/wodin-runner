import {InternalStorage, OdinModelConstructable, UserType, checkUser, getUserScalar, grid, wodinRun} from "../src/runner";
import {ExMinimal} from "./models/minimal";
import {ExDelay} from "./models/delay";

describe("checkUser", () => {
    const pars = new Map<string, number>([["a", 1], ["b", 2], ["c", 3]]);
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

describe("getUserScalar", () => {
    const pars = new Map<string, number>([["a", 1], ["b", 2.5], ["c", 3]]);
    it("Can retrieve a user value", () => {
        const internal = {} as InternalStorage;
        getUserScalar(pars, "a", internal, null, null, null, false);
        expect(internal["a"]).toEqual(1);
    });

    it("Can fall back on default value, erroring if unavailable", () => {
        const internal = {} as InternalStorage;
        getUserScalar(pars, "d", internal, 1, null, null, false);
        expect(internal["d"]).toEqual(1);
        expect(() => getUserScalar(pars, "d", internal, null, null, null, false))
            .toThrow("Expected a value for 'd'");
    });

    it("Can validate that the provided value satisfies constraints", () => {
        const internal = {} as InternalStorage;
        getUserScalar(pars, "a", internal, null, 0, 2, false);
        expect(internal["a"]).toEqual(1);
        expect(() => getUserScalar(pars, "a", internal, null, 2, 4, false))
            .toThrow("Expected 'a' to be at least 2");
        expect(() => getUserScalar(pars, "a", internal, null, -2, 0, false))
            .toThrow("Expected 'a' to be at most 0");
        expect(() => getUserScalar(pars, "b", internal, null, null, null, true))
            .toThrow("Expected 'b' to be integer-like");
    });
});

describe("grid", () => {
    it("Can produce an array of numbers", () => {
        expect(grid(0, 10, 6)).toEqual([0, 2, 4, 6, 8, 10]);
    });
});

describe("can run model", () => {
    it("Can run without error", () => {
        const user = new Map<string, number>();
        const control : any = {};
        const result = wodinRun(ExMinimal, user, 0, 10, control);
    });
});

describe("can run delay model", () => {
    it("Can run without error", () => {
        const user = new Map<string, number>();
        const control : any = {};
        const result = wodinRun(ExDelay, user, 0, 10, control);
    });
});
