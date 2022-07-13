import {versions} from "../src/versions";

test("Can report versions", () => {
    const res = versions();
    expect(res.dfoptim).toBeDefined();
    expect(res.dopri).toBeDefined();
    expect(res.odinjs).toBeDefined();
});
