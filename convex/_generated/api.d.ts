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
import type * as analytics from "../analytics.js";
import type * as billPayments from "../billPayments.js";
import type * as billerDashboard from "../billerDashboard.js";
import type * as billerSearch from "../billerSearch.js";
import type * as billers from "../billers.js";
import type * as bulkPayments from "../bulkPayments.js";
import type * as cashierDashboard from "../cashierDashboard.js";
import type * as credits from "../credits.js";
import type * as http from "../http.js";
import type * as migrations from "../migrations.js";
import type * as ocr from "../ocr.js";
import type * as rbac from "../rbac.js";
import type * as roleSimulation from "../roleSimulation.js";
import type * as sayeleGate from "../sayeleGate.js";
import type * as sayeleGateMutations from "../sayeleGateMutations.js";
import type * as superAdmin from "../superAdmin.js";
import type * as transactions from "../transactions.js";
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
  analytics: typeof analytics;
  billPayments: typeof billPayments;
  billerDashboard: typeof billerDashboard;
  billerSearch: typeof billerSearch;
  billers: typeof billers;
  bulkPayments: typeof bulkPayments;
  cashierDashboard: typeof cashierDashboard;
  credits: typeof credits;
  http: typeof http;
  migrations: typeof migrations;
  ocr: typeof ocr;
  rbac: typeof rbac;
  roleSimulation: typeof roleSimulation;
  sayeleGate: typeof sayeleGate;
  sayeleGateMutations: typeof sayeleGateMutations;
  superAdmin: typeof superAdmin;
  transactions: typeof transactions;
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
