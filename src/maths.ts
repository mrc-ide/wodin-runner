function roundHalfToEven(x: number) {
    if (modr(x, 1) === 0.5) {
        return 2 * Math.round(x / 2);
    } else {
        return Math.round(x);
    }
}

export function round2(x: number, digits?: number) {
    if (digits === undefined || digits === 0) {
        return roundHalfToEven(x);
    } else {
        const mult = Math.pow(10, digits);
        return roundHalfToEven(x * mult) / mult;
    }
}

// modulo that conforms to (approximately) the same behaviour as R
export function modr(x: number, y: number) {
    let tmp = x % y;
    if (tmp * y < 0) {
        tmp += y;
    }
    return tmp;
}

export function intdivr(x: number, y: number) {
    return Math.floor(x / y);
}

export function odinSum1(x: number[], from: number, to: number) {
    let tot = 0.0;
    for (let i = from; i < to; ++i) {
        tot += x[i];
    }
    return tot;
}

// These are generated and are a bit fiddly to get right. I've copied
// over the first 3 as they're generally enough for the tests and for
// most models that anyone will actually write!
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
