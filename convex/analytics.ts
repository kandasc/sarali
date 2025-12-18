import { ConvexError } from "convex/values";
import { query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel.d.ts";

// Helper function to check permissions
async function checkPermission(ctx: QueryCtx, requiredRole: string[]) {
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

// Get transaction analytics with time series data
export const getTransactionAnalytics = query({
  args: {
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    agencyId: v.optional(v.id("agencies")),
  },
  handler: async (ctx, args) => {
    const currentUser = await checkPermission(ctx, [
      "SUPER_ADMIN",
      "MASTER",
      "MANAGER",
      "CHEF_AGENCE",
    ]);

    const startDate = args.startDate || Date.now() - 30 * 24 * 60 * 60 * 1000; // 30 days ago
    const endDate = args.endDate || Date.now();

    let transactions: Doc<"transactions">[] = [];

    // Filter based on role
    if (currentUser.role === "SUPER_ADMIN" || currentUser.role === "MASTER") {
      transactions = await ctx.db.query("transactions").collect();
    } else if (currentUser.role === "MANAGER") {
      const agencies = await ctx.db
        .query("agencies")
        .withIndex("by_network_manager", (q) =>
          q.eq("networkManagerId", currentUser._id)
        )
        .collect();
      const agencyIds = agencies.map((a) => a._id);
      const allTransactions = await ctx.db.query("transactions").collect();
      transactions = allTransactions.filter(
        (t) => t.agencyId && agencyIds.includes(t.agencyId)
      );
    } else if (currentUser.role === "CHEF_AGENCE") {
      if (currentUser.agencyId) {
        transactions = await ctx.db
          .query("transactions")
          .withIndex("by_agency", (q) => q.eq("agencyId", currentUser.agencyId))
          .collect();
      }
    }

    // Filter by date range
    transactions = transactions.filter(
      (t) => t._creationTime >= startDate && t._creationTime <= endDate
    );

    // Filter by agency if specified
    if (args.agencyId) {
      transactions = transactions.filter((t) => t.agencyId === args.agencyId);
    }

    // Group by day for time series
    const dailyData: Record<string, {
      date: string;
      deposits: number;
      withdrawals: number;
      transfers: number;
      payments: number;
      totalAmount: number;
      totalFees: number;
      count: number;
    }> = {};

    transactions.forEach((tx) => {
      const date = new Date(tx._creationTime).toISOString().split("T")[0];
      if (!dailyData[date]) {
        dailyData[date] = {
          date,
          deposits: 0,
          withdrawals: 0,
          transfers: 0,
          payments: 0,
          totalAmount: 0,
          totalFees: 0,
          count: 0,
        };
      }

      dailyData[date].count += 1;
      dailyData[date].totalAmount += tx.amount;
      dailyData[date].totalFees += tx.fees || 0;

      if (tx.type === "DEPOSIT") dailyData[date].deposits += 1;
      if (tx.type === "WITHDRAWAL") dailyData[date].withdrawals += 1;
      if (tx.type === "TRANSFER") dailyData[date].transfers += 1;
      if (tx.type === "PAYMENT") dailyData[date].payments += 1;
    });

    const timeSeriesData = Object.values(dailyData).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Calculate summary statistics
    const totalTransactions = transactions.length;
    const totalAmount = transactions.reduce((sum, tx) => sum + tx.amount, 0);
    const totalFees = transactions.reduce((sum, tx) => sum + (tx.fees || 0), 0);
    const avgTransactionAmount = totalTransactions > 0 ? totalAmount / totalTransactions : 0;

    const depositCount = transactions.filter((t) => t.type === "DEPOSIT").length;
    const withdrawalCount = transactions.filter((t) => t.type === "WITHDRAWAL").length;
    const transferCount = transactions.filter((t) => t.type === "TRANSFER").length;
    const paymentCount = transactions.filter((t) => t.type === "PAYMENT").length;

    return {
      summary: {
        totalTransactions,
        totalAmount,
        totalFees,
        avgTransactionAmount,
        depositCount,
        withdrawalCount,
        transferCount,
        paymentCount,
        currency: currentUser.currency,
      },
      timeSeries: timeSeriesData,
    };
  },
});

// Get agency performance analytics
export const getAgencyPerformance = query({
  args: {
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const currentUser = await checkPermission(ctx, ["SUPER_ADMIN", "MASTER", "MANAGER"]);

    const startDate = args.startDate || Date.now() - 30 * 24 * 60 * 60 * 1000;
    const endDate = args.endDate || Date.now();

    let agencies: Doc<"agencies">[] = [];

    if (currentUser.role === "SUPER_ADMIN" || currentUser.role === "MASTER") {
      agencies = await ctx.db.query("agencies").collect();
    } else if (currentUser.role === "MANAGER") {
      agencies = await ctx.db
        .query("agencies")
        .withIndex("by_network_manager", (q) =>
          q.eq("networkManagerId", currentUser._id)
        )
        .collect();
    }

    const allTransactions = await ctx.db.query("transactions").collect();

    const agencyPerformance = await Promise.all(
      agencies.map(async (agency) => {
        const transactions = allTransactions.filter(
          (t) =>
            t.agencyId === agency._id &&
            t._creationTime >= startDate &&
            t._creationTime <= endDate
        );

        const totalTransactions = transactions.length;
        const totalAmount = transactions.reduce((sum, tx) => sum + tx.amount, 0);
        const totalFees = transactions.reduce((sum, tx) => sum + (tx.fees || 0), 0);

        const users = await ctx.db
          .query("users")
          .withIndex("by_agency", (q) => q.eq("agencyId", agency._id))
          .collect();

        const activeUsers = users.filter((u) => u.status === "ACTIVE").length;

        return {
          agencyId: agency._id,
          agencyName: agency.name,
          agencyCode: agency.code,
          country: agency.country,
          city: agency.city,
          totalTransactions,
          totalAmount,
          totalFees,
          activeUsers,
          creditBalance: agency.creditBalance,
          currency: agency.currency,
        };
      })
    );

    return agencyPerformance.sort((a, b) => b.totalAmount - a.totalAmount);
  },
});

// Get user performance analytics
export const getUserPerformance = query({
  args: {
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    agencyId: v.optional(v.id("agencies")),
  },
  handler: async (ctx, args) => {
    const currentUser = await checkPermission(ctx, [
      "SUPER_ADMIN",
      "MASTER",
      "MANAGER",
      "CHEF_AGENCE",
    ]);

    const startDate = args.startDate || Date.now() - 30 * 24 * 60 * 60 * 1000;
    const endDate = args.endDate || Date.now();

    let users: Doc<"users">[] = [];

    if (currentUser.role === "SUPER_ADMIN" || currentUser.role === "MASTER") {
      users = await ctx.db.query("users").collect();
    } else if (currentUser.role === "MANAGER") {
      const agencies = await ctx.db
        .query("agencies")
        .withIndex("by_network_manager", (q) =>
          q.eq("networkManagerId", currentUser._id)
        )
        .collect();
      const agencyIds = agencies.map((a) => a._id);
      const allUsers = await ctx.db.query("users").collect();
      users = allUsers.filter((u) => u.agencyId && agencyIds.includes(u.agencyId));
    } else if (currentUser.role === "CHEF_AGENCE" && currentUser.agencyId) {
      users = await ctx.db
        .query("users")
        .withIndex("by_agency", (q) => q.eq("agencyId", currentUser.agencyId))
        .collect();
    }

    // Filter by agency if specified
    if (args.agencyId) {
      users = users.filter((u) => u.agencyId === args.agencyId);
    }

    const allTransactions = await ctx.db.query("transactions").collect();

    const userPerformance = await Promise.all(
      users
        .filter((u) => u.role === "CAISSIER" || u.role === "CHEF_AGENCE")
        .map(async (user) => {
          const transactions = allTransactions.filter(
            (t) =>
              t.processedBy === user._id &&
              t._creationTime >= startDate &&
              t._creationTime <= endDate
          );

          const totalTransactions = transactions.length;
          const totalAmount = transactions.reduce((sum, tx) => sum + tx.amount, 0);
          const totalFees = transactions.reduce((sum, tx) => sum + (tx.fees || 0), 0);

          let agency = null;
          if (user.agencyId) {
            agency = await ctx.db.get(user.agencyId);
          }

          return {
            userId: user._id,
            userName: user.name || "N/A",
            userRole: user.role,
            agencyName: agency?.name || "N/A",
            totalTransactions,
            totalAmount,
            totalFees,
            creditBalance: user.creditBalance,
            currency: user.currency,
            status: user.status,
          };
        })
    );

    return userPerformance.sort((a, b) => b.totalAmount - a.totalAmount);
  },
});

// Get financial summary report
export const getFinancialSummary = query({
  args: {
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const currentUser = await checkPermission(ctx, ["SUPER_ADMIN", "MASTER", "MANAGER"]);

    const startDate = args.startDate || Date.now() - 30 * 24 * 60 * 60 * 1000;
    const endDate = args.endDate || Date.now();

    let transactions: Doc<"transactions">[] = [];

    if (currentUser.role === "SUPER_ADMIN" || currentUser.role === "MASTER") {
      transactions = await ctx.db.query("transactions").collect();
    } else if (currentUser.role === "MANAGER") {
      const agencies = await ctx.db
        .query("agencies")
        .withIndex("by_network_manager", (q) =>
          q.eq("networkManagerId", currentUser._id)
        )
        .collect();
      const agencyIds = agencies.map((a) => a._id);
      const allTransactions = await ctx.db.query("transactions").collect();
      transactions = allTransactions.filter(
        (t) => t.agencyId && agencyIds.includes(t.agencyId)
      );
    }

    // Filter by date
    transactions = transactions.filter(
      (t) => t._creationTime >= startDate && t._creationTime <= endDate
    );

    // Calculate metrics by transaction type
    const depositTransactions = transactions.filter((t) => t.type === "DEPOSIT");
    const withdrawalTransactions = transactions.filter((t) => t.type === "WITHDRAWAL");
    const transferTransactions = transactions.filter((t) => t.type === "TRANSFER");
    const paymentTransactions = transactions.filter((t) => t.type === "PAYMENT");

    const depositAmount = depositTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    const withdrawalAmount = withdrawalTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    const transferAmount = transferTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    const paymentAmount = paymentTransactions.reduce((sum, tx) => sum + tx.amount, 0);

    const depositFees = depositTransactions.reduce((sum, tx) => sum + (tx.fees || 0), 0);
    const withdrawalFees = withdrawalTransactions.reduce((sum, tx) => sum + (tx.fees || 0), 0);
    const transferFees = transferTransactions.reduce((sum, tx) => sum + (tx.fees || 0), 0);
    const paymentFees = paymentTransactions.reduce((sum, tx) => sum + (tx.fees || 0), 0);

    const totalAmount = depositAmount + withdrawalAmount + transferAmount + paymentAmount;
    const totalFees = depositFees + withdrawalFees + transferFees + paymentFees;

    // Get credit transactions
    const creditTransactions = await ctx.db.query("creditTransactions").collect();
    const filteredCreditTransactions = creditTransactions.filter(
      (ct) => ct._creationTime >= startDate && ct._creationTime <= endDate
    );

    const totalCreditInjected = filteredCreditTransactions
      .filter((ct) => ct.type === "DEPOSIT" && ct.fromType === "SYSTEM")
      .reduce((sum, ct) => sum + ct.amount, 0);

    return {
      overview: {
        totalTransactions: transactions.length,
        totalAmount,
        totalFees,
        totalCreditInjected,
        currency: currentUser.currency,
      },
      byType: {
        deposits: {
          count: depositTransactions.length,
          amount: depositAmount,
          fees: depositFees,
        },
        withdrawals: {
          count: withdrawalTransactions.length,
          amount: withdrawalAmount,
          fees: withdrawalFees,
        },
        transfers: {
          count: transferTransactions.length,
          amount: transferAmount,
          fees: transferFees,
        },
        payments: {
          count: paymentTransactions.length,
          amount: paymentAmount,
          fees: paymentFees,
        },
      },
    };
  },
});
