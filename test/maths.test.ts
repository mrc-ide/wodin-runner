import {intdivr, modr, round2, odinSum1, odinSum2, odinSum3} from "../src/maths";

describe("round2", () => {
    it("rounds to even away", () => {
        expect(round2(0.5)).toEqual(0);
        expect(round2(1.5)).toEqual(2);
        expect(round2(2.5)).toEqual(2);
        expect(round2(3.5)).toEqual(4);
        expect(round2(3.1)).toEqual(3);
    });

    it("rounds to even when rounding to more digits", () => {
        expect(round2(0.05, 1)).toEqual(0.0);
        expect(round2(0.15, 1)).toEqual(0.2);
        expect(round2(0.25, 1)).toEqual(0.2);
        expect(round2(0.35, 1)).toEqual(0.4);
        expect(round2(0.31, 1)).toEqual(0.3);
    });
});

describe("modr", () => {
    it("works with all signs", () => {
        expect(modr(13, 7)).toEqual(6);
        expect(modr(13, -7)).toEqual(-1);
        expect(modr(-13, 7)).toEqual(1);
        expect(modr(-13, -7)).toEqual(-6);
    })
});

describe("integer division", () => {
    it("works with all signs", () => {
        expect(intdivr(13, 7)).toEqual(1);
        expect(intdivr(13, -7)).toEqual(-2);
        expect(intdivr(-13, 7)).toEqual(-2);
        expect(intdivr(-13, -7)).toEqual(1);
    })
});

describe("sums", () => {
    it("Can sum over a vector", () => {
        const x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        expect(odinSum1(x, 0, 10)).toEqual(55);
        expect(odinSum1(x, 3, 5)).toEqual(9);
    });

    it("Can sum over a matrix", () => {
        const x = [1, 2, 3, 4, 5, 6];
        const nr = 2;
        expect(odinSum2(x, 0, 1, 0, 3, nr)).toEqual(9);
        expect(odinSum2(x, 1, 2, 0, 3, nr)).toEqual(12);
        expect(odinSum2(x, 0, 2, 0, 3, nr)).toEqual(21);
        expect(odinSum2(x, 0, 2, 0, 1, nr)).toEqual(3);
        expect(odinSum2(x, 0, 2, 1, 2, nr)).toEqual(7);
        expect(odinSum2(x, 0, 2, 2, 3, nr)).toEqual(11);
    });

    it("Can sum over a 3d array", () => {
        const x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
        const nr = 2;
        const nc = 3;
        expect(odinSum3(x, 0, 1, 0, 1, 0, 2, nr, nc * nr)).toEqual(8);
        expect(odinSum3(x, 0, 1, 0, 3, 0, 2, nr, nc * nr)).toEqual(36);
        expect(odinSum3(x, 0, 2, 0, 3, 0, 2, nr, nc * nr)).toEqual(78);
        expect(odinSum3(x, 0, 2, 0, 1, 0, 2, nr, nc * nr)).toEqual(18);
    });
});
