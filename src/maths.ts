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
        var mult = Math.pow(10, digits);
        return roundHalfToEven(x * mult) / mult;
    }
}

// modulo that conforms to (approximately) the same behaviour as R
export function modr(x: number, y: number) {
    var tmp = x % y;
    if (tmp * y < 0) {
        tmp += y;
    }
    return tmp;
}

export function intdivr(x: number, y: number) {
    return Math.floor(x / y);
}
