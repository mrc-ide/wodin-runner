import {delay} from "./delay";
import {interpolate} from "./interpolate";
import {maths} from "./maths";
import {user} from "./user";

export const base = {delay, interpolate, maths, user};
export type BaseType = typeof base;
