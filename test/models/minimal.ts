// @ts-nocheck
export class Example {
    constructor(user, unusedUserAction) {
        this.internal = {};
        var internal = this.internal;
        internal.initial_x = 1;
        internal.a = 1;
    }

    rhs(t, state, dstatedt) {
        var internal = this.internal;
        dstatedt[0] = internal.a;
    }

    initial(t) {
        var internal = this.internal;
        var state = Array(1).fill(0);
        state[0] = internal.initial_x;
        return state;
    }

    names() {
        return ["x"];
    }
}
