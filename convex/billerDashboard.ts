import { ConvexError } from "convex/values";
import { query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel.d.ts";

// Get current biller user's dashboard data
export const getDashboardStats = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHENTICATED",
        message: "Non authentifié",
      });
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!user) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Accès non autorisé",
      });
    }

    let billerId: Id<"billers"> | undefined;
    let isSimulation = false;

    // Check if BILLER role
    if (user.role === "BILLER" && user.billerId) {
      billerId = user.billerId;
    }
    // Check for simulation if MASTER or SUPER_ADMIN
    else if (user.role === "MASTER" || user.role === "SUPER_ADMIN") {
      const sessions = await ctx.db
        .query("roleSimulations")
        .withIndex("by_master", (q) => q.eq("masterUserId", user._id))
        .filter((q) => q.eq(q.field("endedAt"), undefined))
        .collect();

      if (sessions.length > 0 && sessions[0].simulatedRole === "BILLER" && sessions[0].targetBillerId) {
        billerId = sessions[0].targetBillerId;
        isSimulation = true;
      }
    }

    if (!billerId) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Accès non autorisé - pas de fournisseur associé",
      });
    }

    // Get the biller info
    const biller = await ctx.db.get(billerId);
    if (!biller) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Fournisseur non trouvé",
      });
    }

    // Get all payments for this biller
    const payments = await ctx.db
      .query("billPayments")
      .collect();
    
    const billerPayments = payments.filter(p => p.billerId === billerId);

    // Calculate stats
    const now = Date.now();
    const todayStart = new Date().setHours(0, 0, 0, 0);
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const monthAgo = now - 30 * 24 * 60 * 60 * 1000;

    const todayPayments = billerPayments.filter(p => p._creationTime >= todayStart);
    const weekPayments = billerPayments.filter(p => p._creationTime >= weekAgo);
    const monthPayments = billerPayments.filter(p => p._creationTime >= monthAgo);

    const completedPayments = billerPayments.filter(p => p.status === "COMPLETED");
    const pendingPayments = billerPayments.filter(p => p.status === "PENDING" || p.status === "PROCESSING");
    const failedPayments = billerPayments.filter(p => p.status === "FAILED");

    const totalAmount = completedPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalFees = completedPayments.reduce((sum, p) => sum + p.fees, 0);
    const todayAmount = todayPayments.filter(p => p.status === "COMPLETED").reduce((sum, p) => sum + p.amount, 0);
    const weekAmount = weekPayments.filter(p => p.status === "COMPLETED").reduce((sum, p) => sum + p.amount, 0);
    const monthAmount = monthPayments.filter(p => p.status === "COMPLETED").reduce((sum, p) => sum + p.amount, 0);

    return {
      biller: {
        id: biller._id,
        name: biller.name,
        code: biller.code,
        category: biller.category,
        logoStorageId: biller.logoStorageId,
      },
      stats: {
        totalTransactions: billerPayments.length,
        completedTransactions: completedPayments.length,
        pendingTransactions: pendingPayments.length,
        failedTransactions: failedPayments.length,
        totalAmount,
        totalFees,
        todayTransactions: todayPayments.length,
        todayAmount,
        weekTransactions: weekPayments.length,
        weekAmount,
        monthTransactions: monthPayments.length,
        monthAmount,
      },
      isSimulation,
    };
  },
});

// Get biller's transactions with pagination
export const getTransactions = query({
  args: {
    status: v.optional(v.union(
      v.literal("PENDING"),
      v.literal("PROCESSING"),
      v.literal("COMPLETED"),
      v.literal("FAILED"),
      v.literal("CANCELLED")
    )),
    limit: v.optional(v.number()),
    isTest: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHENTICATED",
        message: "Non authentifié",
      });
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!user) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Accès non autorisé",
      });
    }

    let billerId: Id<"billers"> | undefined;

    // Check if BILLER role
    if (user.role === "BILLER" && user.billerId) {
      billerId = user.billerId;
    }
    // Check for simulation if MASTER or SUPER_ADMIN
    else if (user.role === "MASTER" || user.role === "SUPER_ADMIN") {
      const sessions = await ctx.db
        .query("roleSimulations")
        .withIndex("by_master", (q) => q.eq("masterUserId", user._id))
        .filter((q) => q.eq(q.field("endedAt"), undefined))
        .collect();

      if (sessions.length > 0 && sessions[0].simulatedRole === "BILLER" && sessions[0].targetBillerId) {
        billerId = sessions[0].targetBillerId;
      }
    }

    if (!billerId) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Accès non autorisé",
      });
    }

    // Get all payments for this biller
    let payments = await ctx.db
      .query("billPayments")
      .order("desc")
      .take(args.limit || 100);
    
    // Filter by biller
    payments = payments.filter(p => p.billerId === billerId);

    // Filter by status if provided
    if (args.status) {
      payments = payments.filter(p => p.status === args.status);
    }

    // Filter by test mode if provided
    if (args.isTest !== undefined) {
      payments = payments.filter(p => p.isTest === args.isTest);
    }

    return payments;
  },
});

// Get biller's daily report
export const getDailyReport = query({
  args: {
    days: v.optional(v.number()),
    includeTest: v.optional(v.boolean()),
    includeAllStatuses: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHENTICATED",
        message: "Non authentifié",
      });
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!user) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Accès non autorisé",
      });
    }

    let billerId: Id<"billers"> | undefined;

    // Check if BILLER role
    if (user.role === "BILLER" && user.billerId) {
      billerId = user.billerId;
    }
    // Check for simulation if MASTER or SUPER_ADMIN
    else if (user.role === "MASTER" || user.role === "SUPER_ADMIN") {
      const sessions = await ctx.db
        .query("roleSimulations")
        .withIndex("by_master", (q) => q.eq("masterUserId", user._id))
        .filter((q) => q.eq(q.field("endedAt"), undefined))
        .collect();

      if (sessions.length > 0 && sessions[0].simulatedRole === "BILLER" && sessions[0].targetBillerId) {
        billerId = sessions[0].targetBillerId;
      }
    }

    if (!billerId) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Accès non autorisé",
      });
    }

    const daysToShow = args.days || 30;
    const startDate = Date.now() - daysToShow * 24 * 60 * 60 * 1000;

    // Get payments for the period
    const allPayments = await ctx.db
      .query("billPayments")
      .collect();
    
    // Filter by biller and date
    let payments = allPayments.filter(
      p => p.billerId === billerId && p._creationTime >= startDate
    );

    // Filter by status (default to all statuses for better visibility)
    if (!args.includeAllStatuses) {
      payments = payments.filter(p => p.status === "COMPLETED" || p.status === "PROCESSING");
    }

    // Filter test transactions unless includeTest is true
    if (!args.includeTest) {
      payments = payments.filter(p => !p.isTest);
    }

    // Group by day
    const dailyData: Record<string, { date: string; count: number; amount: number; fees: number }> = {};
    
    for (const payment of payments) {
      const date = new Date(payment._creationTime).toISOString().split("T")[0];
      if (!dailyData[date]) {
        dailyData[date] = { date, count: 0, amount: 0, fees: 0 };
      }
      dailyData[date].count++;
      dailyData[date].amount += payment.amount;
      dailyData[date].fees += payment.fees;
    }

    // Convert to array and sort by date
    return Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date));
  },
});

// Get biller info (for displaying logo, etc.)
export const getBillerInfo = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!user) {
      return null;
    }

    let billerId: Id<"billers"> | undefined;

    // Check if BILLER role
    if (user.role === "BILLER" && user.billerId) {
      billerId = user.billerId;
    }
    // Check for simulation if MASTER or SUPER_ADMIN
    else if (user.role === "MASTER" || user.role === "SUPER_ADMIN") {
      const sessions = await ctx.db
        .query("roleSimulations")
        .withIndex("by_master", (q) => q.eq("masterUserId", user._id))
        .filter((q) => q.eq(q.field("endedAt"), undefined))
        .collect();

      if (sessions.length > 0 && sessions[0].simulatedRole === "BILLER" && sessions[0].targetBillerId) {
        billerId = sessions[0].targetBillerId;
      }
    }

    if (!billerId) {
      return null;
    }

    const biller = await ctx.db.get(billerId);
    if (!biller) {
      return null;
    }

    // Get logo URL if exists
    let logoUrl: string | null = null;
    if (biller.logoStorageId) {
      logoUrl = await ctx.storage.getUrl(biller.logoStorageId);
    }

    return {
      ...biller,
      logoUrl,
    };
  },
});
