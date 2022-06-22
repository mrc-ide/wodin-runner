export function grid(a: number, b: number, len: number) {
    const dx = (b - a) / (len - 1);
    const x = [];
    for (let i = 0; i < len - 1; ++i) {
        x.push(a + i * dx);
    }
    x.push(b);
    return x;
}
