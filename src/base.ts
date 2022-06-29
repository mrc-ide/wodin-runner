import {delay} from "./delay";
import * as maths from "./maths";
import * as user from "./user";

export const base = {delay, maths, user};
export type BaseType = typeof base;
