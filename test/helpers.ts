const sqrt_dbl_epsilon = Math.pow(2, -52 / 2);

export function approxEqual(x: number, y: number,
                            tolerance = sqrt_dbl_epsilon) {
    let xy = Math.abs(x - y);
    const xn = Math.abs(x);
    if (xn > tolerance) {
        xy /= xn;
    }
    return xy < tolerance;
}

export function approxEqualArray(x: number[], y: number[],
                                 tolerance = sqrt_dbl_epsilon) {
    if (y.length !== x.length) {
        throw Error("Incompatible arrays");
    }
    let scale = 0;
    let xy = 0;
    let n = 0;
    for (let i = 0; i < x.length; ++i) {
        if (x[i] !== y[i]) {
            scale += Math.abs(x[i]);
            xy += Math.abs(x[i] - y[i]);
            n++;
        }
    }
    if (n === 0) {
        return true;
    }

    scale /= n;
    xy /= n;

    if (scale > tolerance) {
        xy /= scale;
    }
    return xy < tolerance;
}
