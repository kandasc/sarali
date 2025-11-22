import { ConvexError } from "convex/values";
import { query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel.d.ts";

// Helper function to check permissions
async function checkCashierPermission(ctx: QueryCtx) {
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

  return user;
}

// Get cashier dashboard overview
export const getCashierOverview = query({
  args: {},
  handler: async (ctx) => {
    const currentUser = await checkCashierPermission(ctx);

    // Get agency details if assigned
    let agency = null;
    if (currentUser.agencyId) {
      agency = await ctx.db.get(currentUser.agencyId);
    }

    // Get manager details if assigned
    let manager = null;
    if (currentUser.managerId) {
      manager = await ctx.db.get(currentUser.managerId);
    }

    // Get recent transactions
    const recentTransactions = await ctx.db
      .query("creditTransactions")
      .withIndex("by_to", (q) => q.eq("toId", currentUser._id))
      .order("desc")
      .take(5);

    // Get activity logs for this user
    const activityLogs = await ctx.db
      .query("activityLogs")
      .withIndex("by_user", (q) => q.eq("userId", currentUser._id))
      .order("desc")
      .take(10);

    // Calculate statistics
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartMs = todayStart.getTime();

    const allTransactions = await ctx.db
      .query("creditTransactions")
      .withIndex("by_to", (q) => q.eq("toId", currentUser._id))
      .collect();

    const todayTransactions = allTransactions.filter(
      (tx) => tx._creationTime >= todayStartMs
    );

    const todayReceived = todayTransactions
      .filter((tx) => tx.type === "TRANSFER" || tx.type === "DEPOSIT")
      .reduce((sum, tx) => sum + tx.amount, 0);

    return {
      user: currentUser,
      agency,
      manager,
      creditBalance: currentUser.creditBalance,
      currency: currentUser.currency,
      recentTransactions,
      activitiesToday: activityLogs.filter((log) => log._creationTime >= todayStartMs).length,
      todayReceived,
      totalTransactions: allTransactions.length,
    };
  },
});

// Get cashier transactions
export const getCashierTransactions = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const currentUser = await checkCashierPermission(ctx);

    // Get transactions where user is recipient
    const receivedTransactions = await ctx.db
      .query("creditTransactions")
      .withIndex("by_to", (q) => q.eq("toId", currentUser._id))
      .order("desc")
      .take(args.limit || 50);

    // Get transactions initiated by user
    const initiatedTransactions = await ctx.db
      .query("creditTransactions")
      .withIndex("by_initiator", (q) => q.eq("initiatedBy", currentUser._id))
      .order("desc")
      .take(args.limit || 50);

    // Combine and sort
    const allTransactions = [...receivedTransactions, ...initiatedTransactions];
    const uniqueTransactions = Array.from(
      new Map(allTransactions.map((tx) => [tx._id, tx])).values()
    ).sort((a, b) => b._creationTime - a._creationTime);

    const limitedTransactions = uniqueTransactions.slice(0, args.limit || 50);

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

// Get cashier activity logs
export const getCashierActivityLogs = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const currentUser = await checkCashierPermission(ctx);

    // Get all logs for this user
    const logs = await ctx.db
      .query("activityLogs")
      .withIndex("by_user", (q) => q.eq("userId", currentUser._id))
      .order("desc")
      .take(args.limit || 50);

    // Enrich with user data
    const enrichedLogs = await Promise.all(
      logs.map(async (log) => {
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

// Get cashier statistics
export const getCashierStats = query({
  args: {},
  handler: async (ctx) => {
    const currentUser = await checkCashierPermission(ctx);

    // Get all transactions
    const allTransactions = await ctx.db
      .query("creditTransactions")
      .withIndex("by_to", (q) => q.eq("toId", currentUser._id))
      .collect();

    const receivedTotal = allTransactions
      .filter((tx) => tx.type === "TRANSFER" || tx.type === "DEPOSIT")
      .reduce((sum, tx) => sum + tx.amount, 0);

    // Calculate by period
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const monthAgo = now - 30 * 24 * 60 * 60 * 1000;

    const weekTransactions = allTransactions.filter(
      (tx) => tx._creationTime >= weekAgo
    );

    const monthTransactions = allTransactions.filter(
      (tx) => tx._creationTime >= monthAgo
    );

    const weekReceived = weekTransactions
      .filter((tx) => tx.type === "TRANSFER" || tx.type === "DEPOSIT")
      .reduce((sum, tx) => sum + tx.amount, 0);

    const monthReceived = monthTransactions
      .filter((tx) => tx.type === "TRANSFER" || tx.type === "DEPOSIT")
      .reduce((sum, tx) => sum + tx.amount, 0);

    return {
      totalTransactions: allTransactions.length,
      totalReceived: receivedTotal,
      weekTransactions: weekTransactions.length,
      weekReceived,
      monthTransactions: monthTransactions.length,
      monthReceived,
      currency: currentUser.currency,
    };
  },
});
