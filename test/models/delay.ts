// @ts-nocheck
export class ExDelay {
    constructor(user, unusedUserAction) {
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
