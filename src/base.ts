import {delay} from "./delay";
import {maths} from "./maths";
import {user} from "./user";

export const base = {delay, maths, user};
export type BaseType = typeof base;
