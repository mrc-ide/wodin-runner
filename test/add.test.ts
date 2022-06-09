import {add} from "../src/index";

describe("example test", () => {
    it("can add two numbers", () => {
        expect(add(1, 2)).toEqual(3);
    });
});
