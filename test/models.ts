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

// @ts-nocheck
export class InterpolateSpline {
    constructor(base, user, unusedUserAction) {
        this.base = base;
        this.internal = {};
        var internal = this.internal;
        internal.initial_y = 0;
        this.setUser(user, unusedUserAction);
    }

    rhs(t, state, dstatedt) {
        var internal = this.internal;
        var pulse = internal.interpolate_pulse.eval(t, 0);
        dstatedt[0] = pulse;
    }

    initial(t) {
        var internal = this.internal;
        var state = Array(1).fill(0);
        state[0] = internal.initial_y;
        return state;
    }

    updateMetadata() {
        this.metadata = {};
        var internal = this.internal;
        this.metadata.ynames = ["t", "y"]
        this.metadata.internalOrder = {dim_tp: null, dim_zp: null, initial_y: null, tp: internal.dim_tp, zp: internal.dim_zp};
        this.metadata.variableOrder = {y: null};
        this.metadata.outputOrder = null;
        this.metadata.interpolateTimes = this.base.interpolate.times([internal.tp[0]], [internal.tp[internal.dim_tp - 1]]);
    }

    setUser(user, unusedUserAction) {
        this.base.user.checkUser(user, ["tp", "zp"], unusedUserAction);
        var internal = this.internal;
        var dim_tp = new Array(2);
        this.base.user.setUserArrayVariable(user, "tp", internal, dim_tp, -Infinity, Infinity, false);
        internal.dim_tp = dim_tp[0];
        var dim_zp = new Array(2);
        this.base.user.setUserArrayVariable(user, "zp", internal, dim_zp, -Infinity, Infinity, false);
        internal.dim_zp = dim_zp[0];
        this.base.interpolate.checkY([internal.dim_tp], [internal.dim_zp], "zp", "pulse");
        internal.interpolate_pulse = this.base.interpolate.alloc("spline", internal.tp, internal.zp)
        this.updateMetadata();
    }

    names() {
        return this.metadata.ynames.slice(1);
    }

    getInternal() {
        return this.internal;
    }

    getMetadata() {
        return this.metadata;
    }
}

// @ts-nocheck
export class InterpolateArray {
    constructor(base, user, unusedUserAction) {
        this.base = base;
        this.internal = {};
        var internal = this.internal;
        internal.dim_pulse = 2;
        internal.dim_y = 2;
        internal.initial_y = new Array(internal.dim_y);
        internal.pulse = new Array(internal.dim_pulse);
        for (var i = 1; i <= internal.dim_y; ++i) {
            internal.initial_y[i - 1] = 0;
        }
        this.setUser(user, unusedUserAction);
    }

    rhs(t, state, dstatedt) {
        var internal = this.internal;
        internal.pulse = internal.interpolate_pulse.evalAll(t);
        for (var i = 1; i <= internal.dim_y; ++i) {
            dstatedt[0 + i - 1] = internal.pulse[i - 1];
        }
    }

    initial(t) {
        var internal = this.internal;
        var state = Array(internal.dim_y).fill(0);
        for (var i = 0; i < internal.dim_y; ++i) {
            state[0 + i] = internal.initial_y[i];
        }
        return state;
    }

    updateMetadata() {
        this.metadata = {};
        var internal = this.internal;
        this.metadata.ynames = ["t"];
        for (var i = 1; i <= internal.dim_y; ++i) {
            this.metadata.ynames.push("y[" + i + "]");
        }
        this.metadata.internalOrder = {dim_pulse: null, dim_tp: null, dim_y: null, dim_zp: null, dim_zp_1: null, dim_zp_2: null, initial_y: internal.dim_y, pulse: internal.dim_pulse, tp: internal.dim_tp, zp: [internal.dim_zp_1, internal.dim_zp_2]};
        this.metadata.variableOrder = {y: internal.dim_y};
        this.metadata.outputOrder = null;
        this.metadata.interpolateTimes = this.base.interpolate.times([internal.tp[0]], []);
    }

    setUser(user, unusedUserAction) {
        this.base.user.checkUser(user, ["tp", "zp"], unusedUserAction);
        var internal = this.internal;
        var dim_tp = new Array(2);
        this.base.user.setUserArrayVariable(user, "tp", internal, dim_tp, -Infinity, Infinity, false);
        internal.dim_tp = dim_tp[0];
        var dim_zp = new Array(3);
        this.base.user.setUserArrayVariable(user, "zp", internal, dim_zp, -Infinity, Infinity, false);
        internal.dim_zp = dim_zp[0];
        internal.dim_zp_1 = dim_zp[1];
        internal.dim_zp_2 = dim_zp[2];
        this.base.interpolate.checkY([internal.dim_tp, internal.dim_pulse], [internal.dim_zp_1, internal.dim_zp_2], "zp", "pulse");
        internal.interpolate_pulse = this.base.interpolate.alloc("constant", internal.tp, internal.zp)
        this.updateMetadata();
    }

    names() {
        return this.metadata.ynames.slice(1);
    }

    getInternal() {
        return this.internal;
    }

    getMetadata() {
        return this.metadata;
    }
}
