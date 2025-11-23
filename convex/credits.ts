import { ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Id, Doc } from "./_generated/dataModel.d.ts";

// Helper function to check permissions
async function checkPermission(
  ctx: QueryCtx | MutationCtx,
  requiredRole: string[]
) {
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

  if (!requiredRole.includes(user.role)) {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: "Insufficient permissions",
    });
  }

  return user;
}

// Add credit to the system (Master only)
export const addSystemCredit = mutation({
  args: {
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    const currentUser = await checkPermission(ctx, ["SUPER_ADMIN", "MASTER"]);

    if (args.amount <= 0) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Amount must be positive",
      });
    }

    const balanceBefore = currentUser.creditBalance;
    const balanceAfter = balanceBefore + args.amount;

    // Update user balance
    await ctx.db.patch(currentUser._id, {
      creditBalance: balanceAfter,
    });

    // Record transaction
    await ctx.db.insert("creditTransactions", {
      type: "DEPOSIT",
      fromType: "SYSTEM",
      toType: "USER",
      toId: currentUser._id,
      amount: args.amount,
      currency: currentUser.currency,
      balanceBefore,
      balanceAfter,
      reason: "System credit deposit",
      initiatedBy: currentUser._id,
      status: "COMPLETED",
    });

    return { success: true, newBalance: balanceAfter };
  },
});

// Transfer credit to user
export const transferCreditToUser = mutation({
  args: {
    toUserId: v.id("users"),
    amount: v.number(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUser = await checkPermission(ctx, [
      "SUPER_ADMIN",
      "MASTER",
      "MANAGER",
      "CHEF_AGENCE",
    ]);

    if (args.amount <= 0) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Amount must be positive",
      });
    }

    // Check if sender has enough balance
    if (currentUser.creditBalance < args.amount) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Insufficient balance",
      });
    }

    // Get recipient user
    const toUser = await ctx.db.get(args.toUserId);
    if (!toUser) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Recipient user not found",
      });
    }

    // Verify hierarchy - can only transfer down
    if (currentUser.role === "CHEF_AGENCE" && toUser.role !== "CAISSIER") {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Chef d'agence can only transfer to caissiers",
      });
    }

    if (
      currentUser.role === "MANAGER" &&
      !["CHEF_AGENCE", "CAISSIER"].includes(toUser.role)
    ) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Manager can only transfer to chef d'agence or caissiers",
      });
    }

    // Verify same agency if CHEF_AGENCE
    if (currentUser.role === "CHEF_AGENCE") {
      if (toUser.agencyId !== currentUser.agencyId) {
        throw new ConvexError({
          code: "FORBIDDEN",
          message: "Can only transfer to users in your agency",
        });
      }
    }

    // Verify currency match
    if (currentUser.currency !== toUser.currency) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Currency mismatch",
      });
    }

    const senderBalanceBefore = currentUser.creditBalance;
    const senderBalanceAfter = senderBalanceBefore - args.amount;
    const recipientBalanceBefore = toUser.creditBalance;
    const recipientBalanceAfter = recipientBalanceBefore + args.amount;

    // Update balances
    await ctx.db.patch(currentUser._id, {
      creditBalance: senderBalanceAfter,
    });

    await ctx.db.patch(args.toUserId, {
      creditBalance: recipientBalanceAfter,
    });

    // Record transaction for sender
    await ctx.db.insert("creditTransactions", {
      type: "TRANSFER",
      fromType: "USER",
      fromId: currentUser._id,
      toType: "USER",
      toId: args.toUserId,
      amount: args.amount,
      currency: currentUser.currency,
      balanceBefore: senderBalanceBefore,
      balanceAfter: senderBalanceAfter,
      reason: args.reason || "Credit transfer",
      initiatedBy: currentUser._id,
      status: "COMPLETED",
    });

    // Record transaction for recipient
    await ctx.db.insert("creditTransactions", {
      type: "TRANSFER",
      fromType: "USER",
      fromId: currentUser._id,
      toType: "USER",
      toId: args.toUserId,
      amount: args.amount,
      currency: toUser.currency,
      balanceBefore: recipientBalanceBefore,
      balanceAfter: recipientBalanceAfter,
      reason: args.reason || "Credit received",
      initiatedBy: currentUser._id,
      status: "COMPLETED",
    });

    return {
      success: true,
      senderBalance: senderBalanceAfter,
      recipientBalance: recipientBalanceAfter,
    };
  },
});

// Transfer credit to agency
export const transferCreditToAgency = mutation({
  args: {
    toAgencyId: v.id("agencies"),
    amount: v.number(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUser = await checkPermission(ctx, ["SUPER_ADMIN", "MASTER", "MANAGER"]);

    if (args.amount <= 0) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Amount must be positive",
      });
    }

    // Check if sender has enough balance
    if (currentUser.creditBalance < args.amount) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Insufficient balance",
      });
    }

    // Get recipient agency
    const toAgency = await ctx.db.get(args.toAgencyId);
    if (!toAgency) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Recipient agency not found",
      });
    }

    // Verify currency match
    if (currentUser.currency !== toAgency.currency) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Currency mismatch",
      });
    }

    const senderBalanceBefore = currentUser.creditBalance;
    const senderBalanceAfter = senderBalanceBefore - args.amount;
    const agencyBalanceBefore = toAgency.creditBalance;
    const agencyBalanceAfter = agencyBalanceBefore + args.amount;

    // Update balances
    await ctx.db.patch(currentUser._id, {
      creditBalance: senderBalanceAfter,
    });

    await ctx.db.patch(args.toAgencyId, {
      creditBalance: agencyBalanceAfter,
    });

    // Record transaction
    await ctx.db.insert("creditTransactions", {
      type: "TRANSFER",
      fromType: "USER",
      fromId: currentUser._id,
      toType: "AGENCY",
      toId: args.toAgencyId,
      amount: args.amount,
      currency: currentUser.currency,
      balanceBefore: senderBalanceBefore,
      balanceAfter: senderBalanceAfter,
      reason: args.reason || `Credit transfer to agency ${toAgency.name}`,
      initiatedBy: currentUser._id,
      status: "COMPLETED",
    });

    return {
      success: true,
      senderBalance: senderBalanceAfter,
      agencyBalance: agencyBalanceAfter,
    };
  },
});

// Get credit overview
export const getCreditOverview = query({
  args: {},
  handler: async (ctx) => {
    const currentUser = await checkPermission(ctx, [
      "SUPER_ADMIN",
      "MASTER",
      "MANAGER",
      "CHEF_AGENCE",
    ]);

    let totalSystemCredit = 0;
    let totalAgencyCredit = 0;
    let totalUserCredit = 0;

    if (currentUser.role === "SUPER_ADMIN" || currentUser.role === "MASTER") {
      // Get all users credit
      const allUsers = await ctx.db.query("users").collect();
      totalUserCredit = allUsers.reduce(
        (sum, user) => sum + user.creditBalance,
        0
      );

      // Get all agencies credit
      const allAgencies = await ctx.db.query("agencies").collect();
      totalAgencyCredit = allAgencies.reduce(
        (sum, agency) => sum + agency.creditBalance,
        0
      );

      totalSystemCredit = totalUserCredit + totalAgencyCredit;
    } else if (currentUser.role === "MANAGER") {
      // Get managed agencies
      const managedAgencies = await ctx.db
        .query("agencies")
        .withIndex("by_network_manager", (q) =>
          q.eq("networkManagerId", currentUser._id)
        )
        .collect();

      totalAgencyCredit = managedAgencies.reduce(
        (sum, agency) => sum + agency.creditBalance,
        0
      );

      // Get users under this manager
      const managedUsers = await ctx.db
        .query("users")
        .withIndex("by_manager", (q) => q.eq("managerId", currentUser._id))
        .collect();

      totalUserCredit = managedUsers.reduce(
        (sum, user) => sum + user.creditBalance,
        0
      );

      totalSystemCredit = totalAgencyCredit + totalUserCredit;
    } else if (currentUser.role === "CHEF_AGENCE" && currentUser.agencyId) {
      // Get agency credit
      const agency = await ctx.db.get(currentUser.agencyId);
      if (agency) {
        totalAgencyCredit = agency.creditBalance;
      }

      // Get users in agency
      const agencyUsers = await ctx.db
        .query("users")
        .withIndex("by_agency", (q) => q.eq("agencyId", currentUser.agencyId))
        .collect();

      totalUserCredit = agencyUsers.reduce(
        (sum, user) => sum + user.creditBalance,
        0
      );

      totalSystemCredit = totalAgencyCredit + totalUserCredit;
    }

    return {
      totalSystemCredit,
      totalAgencyCredit,
      totalUserCredit,
      myBalance: currentUser.creditBalance,
      currency: currentUser.currency,
    };
  },
});

// Get transaction history
export const getTransactionHistory = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const currentUser = await checkPermission(ctx, [
      "SUPER_ADMIN",
      "MASTER",
      "MANAGER",
      "CHEF_AGENCE",
      "CAISSIER",
    ]);

    let transactions;

    if (currentUser.role === "SUPER_ADMIN" || currentUser.role === "MASTER") {
      // Super Admins and Masters see all transactions
      transactions = await ctx.db
        .query("creditTransactions")
        .order("desc")
        .take(args.limit || 50);
    } else {
      // Others see only their transactions
      transactions = await ctx.db
        .query("creditTransactions")
        .withIndex("by_initiator", (q) => q.eq("initiatedBy", currentUser._id))
        .order("desc")
        .take(args.limit || 50);

      // Also include transactions where they are the recipient
      const receivedTransactions = await ctx.db
        .query("creditTransactions")
        .withIndex("by_to", (q) => q.eq("toId", currentUser._id))
        .order("desc")
        .take(args.limit || 50);

      // Combine and sort
      const combined = [...transactions, ...receivedTransactions];
      transactions = combined
        .sort((a, b) => b._creationTime - a._creationTime)
        .slice(0, args.limit || 50);
    }

    // Enrich with user/agency data
    const enrichedTransactions = await Promise.all(
      transactions.map(async (tx) => {
        let fromEntity = null;
        if (tx.fromId && tx.fromType === "USER") {
          fromEntity = await ctx.db.get(tx.fromId as Id<"users">);
        } else if (tx.fromId && tx.fromType === "AGENCY") {
          fromEntity = await ctx.db.get(tx.fromId as Id<"agencies">);
        }

        let toEntity = null;
        if (tx.toType === "USER") {
          toEntity = await ctx.db.get(tx.toId as Id<"users">);
        } else if (tx.toType === "AGENCY") {
          toEntity = await ctx.db.get(tx.toId as Id<"agencies">);
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

// Get users with low credit (alerts)
export const getLowCreditAlerts = query({
  args: {
    threshold: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const currentUser = await checkPermission(ctx, [
      "SUPER_ADMIN",
      "MASTER",
      "MANAGER",
      "CHEF_AGENCE",
    ]);

    const threshold = args.threshold || 10000;
    let users: Doc<"users">[];

    if (currentUser.role === "SUPER_ADMIN" || currentUser.role === "MASTER") {
      users = await ctx.db.query("users").collect();
    } else if (currentUser.role === "MANAGER") {
      users = await ctx.db
        .query("users")
        .withIndex("by_manager", (q) => q.eq("managerId", currentUser._id))
        .collect();
    } else if (currentUser.role === "CHEF_AGENCE" && currentUser.agencyId) {
      users = await ctx.db
        .query("users")
        .withIndex("by_agency", (q) => q.eq("agencyId", currentUser.agencyId))
        .collect();
    } else {
      users = [];
    }

    const lowCreditUsers = users.filter(
      (user) => user.creditBalance < threshold && user.status === "ACTIVE"
    );

    // Enrich with agency data
    const enrichedUsers = await Promise.all(
      lowCreditUsers.map(async (user) => {
        let agency = null;
        if (user.agencyId) {
          agency = await ctx.db.get(user.agencyId);
        }
        return { ...user, agency };
      })
    );

    return enrichedUsers;
  },
});
