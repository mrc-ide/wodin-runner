import {intdivr, modr, round2} from "../src/maths";

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
