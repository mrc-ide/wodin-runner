import * as models from "./models";
import {fitTarget, sumOfSquares} from "../src/fit";
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
