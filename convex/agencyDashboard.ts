import { ConvexError } from "convex/values";
import { query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel.d.ts";

// Helper function to check permissions
async function checkAgencyHeadPermission(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError({
      code: "UNAUTHENTICATED",
      message: "User not logged in",
    });
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) =>
      q.eq("tokenIdentifier", identity.tokenIdentifier)
    )
    .unique();

  if (!user) {
    throw new ConvexError({
      code: "NOT_FOUND",
      message: "User not found",
    });
  }

  if (user.role !== "CHEF_AGENCE") {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: "Only agency heads can access this",
    });
  }

  if (!user.agencyId) {
    throw new ConvexError({
      code: "BAD_REQUEST",
      message: "User not assigned to an agency",
    });
  }

  return user;
}

// Get agency dashboard overview
export const getAgencyOverview = query({
  args: {},
  handler: async (ctx) => {
    const currentUser = await checkAgencyHeadPermission(ctx);

    // Get agency details
    const agency = await ctx.db.get(currentUser.agencyId!);
    if (!agency) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Agency not found",
      });
    }

    // Get all cashiers in the agency
    const cashiers = await ctx.db
      .query("users")
      .withIndex("by_agency", (q) => q.eq("agencyId", currentUser.agencyId!))
      .collect();

    const activeCashiers = cashiers.filter(
      (c) => c.role === "CAISSIER" && c.status === "ACTIVE"
    );

    // Get total credit across all users
    const totalCreditInUsers = cashiers.reduce(
      (sum, user) => sum + user.creditBalance,
      0
    );

    // Get recent transactions
    const recentTransactions = await ctx.db
      .query("creditTransactions")
      .withIndex("by_to", (q) => q.eq("toId", currentUser.agencyId!))
      .order("desc")
      .take(5);

    // Get activity logs for this agency
    const agencyUsers = cashiers.map((u) => u._id);
    const allLogs = await ctx.db
      .query("activityLogs")
      .order("desc")
      .take(100);

    const agencyLogs = allLogs.filter((log) =>
      agencyUsers.includes(log.userId)
    );

    // Calculate statistics
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartMs = todayStart.getTime();

    const todayLogs = agencyLogs.filter((log) => log._creationTime >= todayStartMs);

    return {
      agency,
      totalCashiers: activeCashiers.length,
      agencyCreditBalance: agency.creditBalance,
      totalCreditInUsers,
      totalCredit: agency.creditBalance + totalCreditInUsers,
      recentTransactions,
      activitiesToday: todayLogs.length,
      currency: agency.currency,
    };
  },
});

// Get all cashiers in the agency
export const getAgencyCashiers = query({
  args: {
    status: v.optional(v.union(v.literal("ACTIVE"), v.literal("INACTIVE"))),
  },
  handler: async (ctx, args) => {
    const currentUser = await checkAgencyHeadPermission(ctx);

    // Get all users in the agency
    const users = await ctx.db
      .query("users")
      .withIndex("by_agency", (q) => q.eq("agencyId", currentUser.agencyId!))
      .collect();

    // Filter cashiers only
    let cashiers = users.filter((u) => u.role === "CAISSIER");

    // Apply status filter
    if (args.status) {
      cashiers = cashiers.filter((c) => c.status === args.status);
    }

    // Sort by creation time (newest first)
    cashiers.sort((a, b) => b._creationTime - a._creationTime);

    return cashiers;
  },
});

// Get agency transactions
export const getAgencyTransactions = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const currentUser = await checkAgencyHeadPermission(ctx);

    // Get all users in the agency
    const agencyUsers = await ctx.db
      .query("users")
      .withIndex("by_agency", (q) => q.eq("agencyId", currentUser.agencyId!))
      .collect();

    const agencyUserIds = agencyUsers.map((u) => u._id);

    // Get all transactions
    const allTransactions = await ctx.db
      .query("creditTransactions")
      .order("desc")
      .take(500);

    // Filter transactions related to this agency
    const agencyTransactions = allTransactions.filter(
      (tx) =>
        tx.toId === currentUser.agencyId! ||
        (tx.fromId && agencyUserIds.includes(tx.fromId as Doc<"users">["_id"])) ||
        agencyUserIds.includes(tx.toId as Doc<"users">["_id"])
    );

    // Take only the limit
    const limitedTransactions = agencyTransactions.slice(0, args.limit || 50);

    // Enrich with user/agency data
    const enrichedTransactions = await Promise.all(
      limitedTransactions.map(async (tx) => {
        let fromEntity = null;
        if (tx.fromId && tx.fromType === "USER") {
          fromEntity = await ctx.db.get(tx.fromId as Doc<"users">["_id"]);
        } else if (tx.fromId && tx.fromType === "AGENCY") {
          fromEntity = await ctx.db.get(tx.fromId as Doc<"agencies">["_id"]);
        }

        let toEntity = null;
        if (tx.toType === "USER") {
          toEntity = await ctx.db.get(tx.toId as Doc<"users">["_id"]);
        } else if (tx.toType === "AGENCY") {
          toEntity = await ctx.db.get(tx.toId as Doc<"agencies">["_id"]);
        }

        const initiator = await ctx.db.get(tx.initiatedBy);

        return {
          ...tx,
          fromEntity,
          toEntity,
          initiator,
          createdAt: new Date(tx._creationTime).toISOString(),
        };
      })
    );

    return enrichedTransactions;
  },
});

// Get agency activity logs
export const getAgencyActivityLogs = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const currentUser = await checkAgencyHeadPermission(ctx);

    // Get all users in the agency
    const agencyUsers = await ctx.db
      .query("users")
      .withIndex("by_agency", (q) => q.eq("agencyId", currentUser.agencyId!))
      .collect();

    const agencyUserIds = agencyUsers.map((u) => u._id);

    // Get all logs
    const allLogs = await ctx.db
      .query("activityLogs")
      .order("desc")
      .take(500);

    // Filter logs related to this agency
    const agencyLogs = allLogs.filter((log) =>
      agencyUserIds.includes(log.userId)
    );

    // Take only the limit
    const limitedLogs = agencyLogs.slice(0, args.limit || 50);

    // Enrich with user data
    const enrichedLogs = await Promise.all(
      limitedLogs.map(async (log) => {
        const user = await ctx.db.get(log.userId);
        return {
          ...log,
          user,
          createdAt: new Date(log._creationTime).toISOString(),
        };
      })
    );

    return enrichedLogs;
  },
});

// Get low credit cashiers
export const getLowCreditCashiers = query({
  args: {
    threshold: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const currentUser = await checkAgencyHeadPermission(ctx);

    const threshold = args.threshold || 5000;

    // Get all cashiers in the agency
    const users = await ctx.db
      .query("users")
      .withIndex("by_agency", (q) => q.eq("agencyId", currentUser.agencyId!))
      .collect();

    const cashiers = users.filter(
      (u) =>
        u.role === "CAISSIER" &&
        u.status === "ACTIVE" &&
        u.creditBalance < threshold
    );

    return cashiers;
  },
});
