export function grid(a: number, b: number, len: number) {
    const dx = (b - a) / (len - 1);
    const x = [];
    for (let i = 0; i < len - 1; ++i) {
        x.push(a + i * dx);
    }
    x.push(b);
    return x;
}

export function gridLog(a: number, b: number, len: number) {
    return grid(Math.log(a), Math.log(b), len).map(Math.exp);
}

export function whichMin(x: number[]) {
    let idx = -1;
    let min = Infinity;
    for (let i = 0; i < x.length; ++i) {
        if (x[i] < min) {
            idx = i;
            min = x[i];
        }
    }
    return idx;
}

export function whichMax(x: number[]) {
    let idx = -1;
    let max = -Infinity;
    for (let i = 0; i < x.length; ++i) {
        if (x[i] > max) {
            idx = i;
            max = x[i];
        }
    }
    return idx;
}

export function loop<T>(n: number, f: (i: number) => T): T[] {
    const ret = [];
    for (let i = 0; i < n; ++i) {
        ret.push(f(i));
    }
    return ret;
}


// note that this is inclusive, i.e. [a, b] not [a, b - 1]
export function seq(a: number, b: number): number[] {
    const ret = [];
    for (let i = a; i <= b; ++i) {
        ret.push(i);
    }
    return ret;
}
