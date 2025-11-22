/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as agencies from "../agencies.js";
import type * as agenciesStats from "../agenciesStats.js";
import type * as agencyDashboard from "../agencyDashboard.js";
import type * as cashierDashboard from "../cashierDashboard.js";
import type * as credits from "../credits.js";
import type * as rbac from "../rbac.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  agencies: typeof agencies;
  agenciesStats: typeof agenciesStats;
  agencyDashboard: typeof agencyDashboard;
  cashierDashboard: typeof cashierDashboard;
  credits: typeof credits;
  rbac: typeof rbac;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
