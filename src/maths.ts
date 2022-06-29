function roundHalfToEven(x: number) {
    if (modr(x, 1) === 0.5) {
        return 2 * Math.round(x / 2);
    } else {
        return Math.round(x);
    }
}

/** Round a number. This function diffes from `Math.round` in two
 * respects - it can round to a number of digits with the optional
 * `digits` argument:
 *
 * ```typescript
 * round2(1.2345, 2) // 1.23
 * ```
 *
 * It follows the ["round half to
 * even"](https://en.wikipedia.org/wiki/Rounding#Round_half_to_even)
 * rounding rule, which avoids some biases
 *
 * ```typescript
 * const x = [-2.5, -1.5, -0.5, 0.5, 1.5, 2.5];
 * x.map(Math.round); // [ -2, -1, -0, 1, 2, 3 ]
 * x.map(round2);     // [ -2  -2   0  0  2  2 ]
 * ```
 *
 * @param x Number to be rounded
 *
 * @param digits Optional number of digits for `x` to be rounded to
 * (default is zero)
 */
export function round2(x: number, digits?: number) {
    if (digits === undefined || digits === 0) {
        return roundHalfToEven(x);
    } else {
        const mult = Math.pow(10, digits);
        return roundHalfToEven(x * mult) / mult;
    }
}

/** A modulo (`%`) function that follows the same rules as R's `%%`
 * for negative `x`
 *
 * ```typescript
 * const x = [-3, -2, -1, 0, 1, 2, 3];
 * x.map((el: number) => x % 3);      // [-0, -2, -1, 0, 1, 2, 0]
 * x.map((el: number) => modr(x, 3)); // [-0,  1,  2, 0, 1, 2, 0]
 * ```
 *
 * @param x Dividend
 *
 * @param y Divisor
 */
export function modr(x: number, y: number) {
    let tmp = x % y;
    if (tmp * y < 0) {
        tmp += y;
    }
    return tmp;
}

/** Integer division
 * @param x Dividend
 *
 * @param y Divisor
 */
export function intdivr(x: number, y: number) {
    return Math.floor(x / y);
}

/** (Partial) sum over a single dimensional array
 * @param x Array to be summed over
 *
 * @param from Index within `x` to start at
 *
 * @param to Index within `x` to finish at
 */
export function odinSum1(x: number[], from: number, to: number) {
    let tot = 0.0;
    for (let i = from; i < to; ++i) {
        tot += x[i];
    }
    return tot;
}

// The remaining sums are generated and are a bit fiddly to get
// right. I've copied over the first 3 as they're generally enough for
// the tests and for most models that anyone will actually write!

/** (Partial) sum over a matrix
 *
 * @param x Matrix to be summed over, stored as a flat array in
 * column-major format
 *
 * @param iFrom Row index within `x` to start at
 *
 * @param iTo Row within `x` to finish at
 *
 * @param jFrom Column index within `x` to start at
 *
 * @param jTo Column within `x` to finish at
 *
 * @param dim1 Number of rows (length of dimension 1)
 */
export function odinSum2(x: number[], iFrom: number, iTo: number, jFrom: number, jTo: number, dim1: number) {
    let tot = 0.0;
    for (let j = jFrom; j < jTo; ++j) {
        const jj = j * dim1;
        for (let i = iFrom; i < iTo; ++i) {
            tot += x[i + jj];
        }
    }
    return tot;
}

/** (Partial) sum over a 3d array (tensor)
 *
 * @param x Array to be summed over, stored as a flat array
 *
 * @param iFrom First dimension index within `x` to start at
 *
 * @param iTo First within `x` to finish at
 *
 * @param jFrom Second dimension index within `x` to start at
 *
 * @param jTo Second dimension within `x` to finish at
 *
 * @param kFrom Third dimension index within `x` to start at
 *
 * @param kTo Third dimension within `x` to finish at
 *
 * @param dim1 Length of dimension 1
 *
 * @param dim12 Length of the product of the first two dimensions
 */
export function odinSum3(x: number[], iFrom: number, iTo: number,
                         jFrom: number, jTo: number, kFrom: number,
                         kTo: number, dim1: number, dim12: number) {
    let tot = 0.0;
    for (let k = kFrom; k < kTo; ++k) {
        const kk = k * dim12;
        for (let j = jFrom; j < jTo; ++j) {
            const jj = j * dim1 + kk;
            for (let i = iFrom; i < iTo; ++i) {
                tot += x[i + jj];
            }
        }
    }
    return tot;
}

export const maths = {
    intdivr,
    modr,
    odinSum1,
    odinSum2,
    odinSum3,
    round2,
};
