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
