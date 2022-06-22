// @ts-nocheck
export class Minimal {
    constructor(userHelpers, user, unusedUserAction) {
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

// @ts-nocheck
export class Delay {
    constructor(userHelpers, user, unusedUserAction) {
        this.internal = {};
        var internal = this.internal;
        internal.a = 1;
        internal.delay_index_x_lag = Array(1).fill(0);
        internal.delay_state_x_lag = Array(1).fill(0);
        internal.delay_index_x_lag[0] = 0;
        internal.initial_x = 1;
        this.internal.initial_t = NaN;
    }

    rhs(t, state, dstatedt, solution) {
        var internal = this.internal;
        dstatedt[0] = internal.a;
    }

    output(t, state, solution) {
        var internal = this.internal;
        var output = new Array(1);
        const x_lag = ((t) => {
            this.base.delay(solution, t, internal.delay_index_x_lag, internal.delay_state_x_lag);
            const x = internal.delay_state_x_lag[0];
            const x_lag = x;
            return x_lag;
        })(t - 2);
        output[0] = x_lag;
        return output;
    }

    initial(t) {
        var internal = this.internal;
        var state = Array(1).fill(0);
        state[0] = internal.initial_x;
        return state;
    }

    names() {
        return ["x", "y"];
    }
}

// @ts-nocheck
export class User {
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
        this.metadata.ynames = ["t", "x"];
        this.metadata.internalOrder = {a: null, initial_x: null};
        this.metadata.variableOrder = {x: null};
        this.metadata.outputOrder = null;
    }

    setUser(userHelpers, user, unusedUserAction) {
        const internal = this.internal;
        userHelpers.checkUser(user, ["a"], unusedUserAction);
        userHelpers.getUserScalar(user, "a", internal, 1, null, null, false);
        this.updateMetadata();
    }
}

// @ts-nocheck
export class Output {
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
