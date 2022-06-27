// @ts-nocheck
export class Minimal {
    constructor(base, user, unusedUserAction) {
        this.base = base;
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

    getMetadata() {
        return {};
    }

    getInternal() {
        return this.internal;
    }

    setUser(user, unusedUserAction) {
    }
}

// @ts-nocheck
export class Delay {
    constructor(base, user, unusedUserAction) {
        this.base = base;
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

    getMetadata() {
        return {};
    }

    getInternal() {
        return this.internal;
    }

    setUser(user, unusedUserAction) {
    }
}

// @ts-nocheck
export class User {
    constructor(base, user, unusedUserAction) {
        this.base = base;
        this.internal = {};
        var internal = this.internal;
        internal.initial_x = 1;
        this.setUser(user, unusedUserAction);
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

    setUser(user, unusedUserAction) {
        const internal = this.internal;
        this.base.user.checkUser(user, ["a"], unusedUserAction);
        this.base.user.setUserScalar(user, "a", internal, 1,
                                     -Infinity, Infinity, false);
        this.updateMetadata();
    }

    getMetadata() {
        return this.metadata;
    }

    getInternal() {
        return this.internal;
    }
}

// @ts-nocheck
export class Output {
    constructor(base, user, unusedUserAction) {
        this.base = base;
        this.internal = {};
        var internal = this.internal;
        internal.initial_x = 1;
        this.setUser(user, unusedUserAction);
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

    setUser(user, unusedUserAction) {
        var internal = this.internal;
        this.base.user.checkUser(user, ["a"], unusedUserAction);
        this.base.user.setUserScalar(user, "a", internal, 1,
                                     -Infinity, Infinity, false);
        this.updateMetadata();
    }

    getMetadata() {
        return this.metadata;
    }

    getInternal() {
        return this.internal;
    }
}

// @ts-nocheck
export class DelayNoOutput {
    constructor(base, user, unusedUserAction) {
        this.base = base;
        this.internal = {};
        var internal = this.internal;
        internal.delay_index_x_lag = Array(1).fill(0);
        internal.delay_state_x_lag = Array(1).fill(0);
        internal.delay_index_x_lag[0] = 0;
        internal.initial_x = 1;
        internal.initial_y = 1;
        this.setUser(user, unusedUserAction);
        this.internal.initial_t = NaN;
    }

    rhs(t, state, dstatedt, solution) {
        var internal = this.internal;
        dstatedt[0] = 1;
        const x_lag = ((t) => {
            this.base.delay(solution, t, internal.delay_index_x_lag, internal.delay_state_x_lag);
            const x = internal.delay_state_x_lag[0];
            const x_lag = x;
            return x_lag;
        })(t - 2);
        dstatedt[1] = x_lag;
    }

    initial(t) {
        var internal = this.internal;
        var state = Array(2).fill(0);
        state[0] = internal.initial_x;
        state[1] = internal.initial_y;
        return state;
    }

    updateMetadata() {
        this.metadata = {};
        this.metadata.ynames = ["t", "x", "y"];
        this.metadata.internalOrder = {delay_index_x_lag: 1, delay_state_x_lag: 1, initial_t: null, initial_x: null, initial_y: null};
        this.metadata.variableOrder = {x: null, y: null};
        this.metadata.outputOrder = null;
    }

    setUser(user, unusedUserAction) {
        this.base.user.checkUser(user, [], unusedUserAction);
        this.updateMetadata();
    }

    names() {
        return this.metadata.ynames.slice(1);
    }

    getMetadata() {
        return this.metadata;
    }

    getInternal() {
        return this.internal;
    }
}
