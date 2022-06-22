// @ts-nocheck
export class ExOutput {
    constructor(userHelpers, user, unusedUserAction) {
        this.internal = {};
        var internal = this.internal;
        internal.initial_x = 1;
        this.setUser(userHelpers, user, unusedUserAction);
    }

    rhs(t, state, dstatedt) {
        var internal = this.internal;
        dstatedt[0] = internal.a;
    }

    output(t, state) {
        var output = new Array(1);
        const x = state[0];
        output[0] = x * 2;
        return output;
    }

    initial(t) {
        var internal = this.internal;
        var state = Array(1).fill(0);
        state[0] = internal.initial_x;
        return state;
    }

    names() {
        return this.metadata.ynames.slice(1);
    }

    updateMetadata() {
        this.metadata = {};
        this.metadata.ynames = ["t", "x", "y"];
        this.metadata.internalOrder = {a: null, initial_x: null};
        this.metadata.variableOrder = {x: null};
        this.metadata.outputOrder = {y: null};
    }

    setUser(userHelpers, user, unusedUserAction) {
        var internal = this.internal;
        userHelpers.checkUser(user, ["a"], unusedUserAction);
        userHelpers.getUserScalar(user, "a", internal, 1, null, null, false);
        this.updateMetadata();
    }
}
