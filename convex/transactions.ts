import { ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Id, Doc } from "./_generated/dataModel.d.ts";

// Helper function to check permissions
async function checkPermission(ctx: QueryCtx | MutationCtx, requiredRole: string[]) {
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

// Generate unique transaction reference
function generateReference(type: string): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  const prefix = type.substring(0, 3).toUpperCase();
  return `${prefix}${timestamp}${random}`;
}

// Log activity
async function logActivity(
  ctx: MutationCtx,
  userId: Id<"users">,
  action: string,
  entityType: string,
  entityId?: string,
  details?: string
) {
  await ctx.db.insert("activityLogs", {
    userId,
    action,
    entityType,
    entityId,
    details,
  });
}

// Create a deposit transaction
export const createDeposit = mutation({
  args: {
    customerName: v.string(),
    customerPhone: v.string(),
    customerIdNumber: v.optional(v.string()),
    amount: v.number(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUser = await checkPermission(ctx, ["CAISSIER", "CHEF_AGENCE"]);

    if (args.amount <= 0) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Amount must be positive",
      });
    }

    // Calculate fees (1% for deposits)
    const fees = Math.round(args.amount * 0.01);
    const totalAmount = args.amount + fees;

    // Generate reference
    const reference = generateReference("DEPOSIT");

    // Create transaction
    const transactionId = await ctx.db.insert("transactions", {
      type: "DEPOSIT",
      customerName: args.customerName,
      customerPhone: args.customerPhone,
      customerIdNumber: args.customerIdNumber,
      amount: args.amount,
      currency: currentUser.currency,
      fees,
      totalAmount,
      reference,
      description: args.description,
      status: "COMPLETED",
      processedBy: currentUser._id,
      agencyId: currentUser.agencyId,
    });

    // Update user credit balance
    await ctx.db.patch(currentUser._id, {
      creditBalance: currentUser.creditBalance + args.amount,
    });

    // Log activity
    await logActivity(
      ctx,
      currentUser._id,
      "CREATE_TRANSACTION",
      "transactions",
      transactionId,
      `Deposit of ${args.amount} ${currentUser.currency} for ${args.customerName}`
    );

    return { transactionId, reference };
  },
});

// Create a withdrawal transaction
export const createWithdrawal = mutation({
  args: {
    customerName: v.string(),
    customerPhone: v.string(),
    customerIdNumber: v.optional(v.string()),
    amount: v.number(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUser = await checkPermission(ctx, ["CAISSIER", "CHEF_AGENCE"]);

    if (args.amount <= 0) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Amount must be positive",
      });
    }

    // Calculate fees (1.5% for withdrawals)
    const fees = Math.round(args.amount * 0.015);
    const totalAmount = args.amount + fees;

    // Check if user has sufficient balance
    if (currentUser.creditBalance < totalAmount) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Insufficient balance",
      });
    }

    // Generate reference
    const reference = generateReference("WITHDRAWAL");

    // Create transaction
    const transactionId = await ctx.db.insert("transactions", {
      type: "WITHDRAWAL",
      customerName: args.customerName,
      customerPhone: args.customerPhone,
      customerIdNumber: args.customerIdNumber,
      amount: args.amount,
      currency: currentUser.currency,
      fees,
      totalAmount,
      reference,
      description: args.description,
      status: "COMPLETED",
      processedBy: currentUser._id,
      agencyId: currentUser.agencyId,
    });

    // Update user credit balance
    await ctx.db.patch(currentUser._id, {
      creditBalance: currentUser.creditBalance - totalAmount,
    });

    // Log activity
    await logActivity(
      ctx,
      currentUser._id,
      "CREATE_TRANSACTION",
      "transactions",
      transactionId,
      `Withdrawal of ${args.amount} ${currentUser.currency} for ${args.customerName}`
    );

    return { transactionId, reference };
  },
});

// Create a transfer transaction
export const createTransfer = mutation({
  args: {
    customerName: v.string(),
    customerPhone: v.string(),
    customerIdNumber: v.optional(v.string()),
    recipientName: v.string(),
    recipientPhone: v.string(),
    amount: v.number(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUser = await checkPermission(ctx, ["CAISSIER", "CHEF_AGENCE"]);

    if (args.amount <= 0) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Amount must be positive",
      });
    }

    // Calculate fees (2% for transfers)
    const fees = Math.round(args.amount * 0.02);
    const totalAmount = args.amount + fees;

    // Check if user has sufficient balance
    if (currentUser.creditBalance < totalAmount) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Insufficient balance",
      });
    }

    // Generate reference
    const reference = generateReference("TRANSFER");

    // Create transaction
    const transactionId = await ctx.db.insert("transactions", {
      type: "TRANSFER",
      customerName: args.customerName,
      customerPhone: args.customerPhone,
      customerIdNumber: args.customerIdNumber,
      recipientName: args.recipientName,
      recipientPhone: args.recipientPhone,
      amount: args.amount,
      currency: currentUser.currency,
      fees,
      totalAmount,
      reference,
      description: args.description,
      status: "COMPLETED",
      processedBy: currentUser._id,
      agencyId: currentUser.agencyId,
    });

    // Update user credit balance
    await ctx.db.patch(currentUser._id, {
      creditBalance: currentUser.creditBalance - totalAmount,
    });

    // Log activity
    await logActivity(
      ctx,
      currentUser._id,
      "CREATE_TRANSACTION",
      "transactions",
      transactionId,
      `Transfer of ${args.amount} ${currentUser.currency} from ${args.customerName} to ${args.recipientName}`
    );

    return { transactionId, reference };
  },
});

// Create a payment transaction
export const createPayment = mutation({
  args: {
    customerName: v.string(),
    customerPhone: v.string(),
    customerIdNumber: v.optional(v.string()),
    amount: v.number(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const currentUser = await checkPermission(ctx, ["CAISSIER", "CHEF_AGENCE"]);

    if (args.amount <= 0) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Amount must be positive",
      });
    }

    // Calculate fees (1% for payments)
    const fees = Math.round(args.amount * 0.01);
    const totalAmount = args.amount + fees;

    // Check if user has sufficient balance
    if (currentUser.creditBalance < totalAmount) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Insufficient balance",
      });
    }

    // Generate reference
    const reference = generateReference("PAYMENT");

    // Create transaction
    const transactionId = await ctx.db.insert("transactions", {
      type: "PAYMENT",
      customerName: args.customerName,
      customerPhone: args.customerPhone,
      customerIdNumber: args.customerIdNumber,
      amount: args.amount,
      currency: currentUser.currency,
      fees,
      totalAmount,
      reference,
      description: args.description,
      status: "COMPLETED",
      processedBy: currentUser._id,
      agencyId: currentUser.agencyId,
    });

    // Update user credit balance
    await ctx.db.patch(currentUser._id, {
      creditBalance: currentUser.creditBalance - totalAmount,
    });

    // Log activity
    await logActivity(
      ctx,
      currentUser._id,
      "CREATE_TRANSACTION",
      "transactions",
      transactionId,
      `Payment of ${args.amount} ${currentUser.currency} for ${args.customerName} - ${args.description}`
    );

    return { transactionId, reference };
  },
});

// Get all transactions
export const listTransactions = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const currentUser = await checkPermission(ctx, [
      "MASTER",
      "MANAGER",
      "CHEF_AGENCE",
      "CAISSIER",
    ]);

    let transactions;

    if (currentUser.role === "MASTER") {
      // Masters see all transactions
      transactions = await ctx.db
        .query("transactions")
        .order("desc")
        .take(args.limit || 50);
    } else if (currentUser.role === "MANAGER") {
      // Managers see transactions from their agencies
      const agencies = await ctx.db
        .query("agencies")
        .withIndex("by_network_manager", (q) =>
          q.eq("networkManagerId", currentUser._id)
        )
        .collect();

      const agencyIds = agencies.map((a) => a._id);
      const allTransactions = await ctx.db
        .query("transactions")
        .order("desc")
        .take(500);

      transactions = allTransactions
        .filter((t) => t.agencyId && agencyIds.includes(t.agencyId))
        .slice(0, args.limit || 50);
    } else if (currentUser.role === "CHEF_AGENCE") {
      // Agency heads see transactions from their agency
      if (!currentUser.agencyId) {
        return [];
      }

      transactions = await ctx.db
        .query("transactions")
        .withIndex("by_agency", (q) => q.eq("agencyId", currentUser.agencyId))
        .order("desc")
        .take(args.limit || 50);
    } else {
      // Cashiers see only their own transactions
      transactions = await ctx.db
        .query("transactions")
        .withIndex("by_processed_by", (q) => q.eq("processedBy", currentUser._id))
        .order("desc")
        .take(args.limit || 50);
    }

    // Enrich with processor data
    const enrichedTransactions = await Promise.all(
      transactions.map(async (tx) => {
        const processor = await ctx.db.get(tx.processedBy);
        let agency = null;
        if (tx.agencyId) {
          agency = await ctx.db.get(tx.agencyId);
        }

        return {
          ...tx,
          processor,
          agency,
          createdAt: new Date(tx._creationTime).toISOString(),
        };
      })
    );

    return enrichedTransactions;
  },
});

// Get transaction by reference
export const getTransactionByReference = query({
  args: { reference: v.string() },
  handler: async (ctx, args) => {
    await checkPermission(ctx, [
      "MASTER",
      "MANAGER",
      "CHEF_AGENCE",
      "CAISSIER",
    ]);

    const transaction = await ctx.db
      .query("transactions")
      .withIndex("by_reference", (q) => q.eq("reference", args.reference))
      .unique();

    if (!transaction) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Transaction not found",
      });
    }

    const processor = await ctx.db.get(transaction.processedBy);
    let agency = null;
    if (transaction.agencyId) {
      agency = await ctx.db.get(transaction.agencyId);
    }

    return {
      ...transaction,
      processor,
      agency,
      createdAt: new Date(transaction._creationTime).toISOString(),
    };
  },
});

// Get transaction statistics
export const getTransactionStats = query({
  args: {},
  handler: async (ctx) => {
    const currentUser = await checkPermission(ctx, [
      "MASTER",
      "MANAGER",
      "CHEF_AGENCE",
      "CAISSIER",
    ]);

    let transactions: Doc<"transactions">[];

    if (currentUser.role === "MASTER") {
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
      if (!currentUser.agencyId) {
        transactions = [];
      } else {
        transactions = await ctx.db
          .query("transactions")
          .withIndex("by_agency", (q) => q.eq("agencyId", currentUser.agencyId))
          .collect();
      }
    } else {
      transactions = await ctx.db
        .query("transactions")
        .withIndex("by_processed_by", (q) => q.eq("processedBy", currentUser._id))
        .collect();
    }

    // Calculate statistics
    const now = Date.now();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartMs = todayStart.getTime();

    const todayTransactions = transactions.filter(
      (tx) => tx._creationTime >= todayStartMs
    );

    const deposits = transactions.filter((tx) => tx.type === "DEPOSIT");
    const withdrawals = transactions.filter((tx) => tx.type === "WITHDRAWAL");
    const transfers = transactions.filter((tx) => tx.type === "TRANSFER");
    const payments = transactions.filter((tx) => tx.type === "PAYMENT");

    const totalAmount = transactions.reduce((sum, tx) => sum + tx.amount, 0);
    const totalFees = transactions.reduce((sum, tx) => sum + (tx.fees || 0), 0);
    const todayAmount = todayTransactions.reduce((sum, tx) => sum + tx.amount, 0);

    return {
      totalTransactions: transactions.length,
      todayTransactions: todayTransactions.length,
      totalAmount,
      totalFees,
      todayAmount,
      deposits: deposits.length,
      withdrawals: withdrawals.length,
      transfers: transfers.length,
      payments: payments.length,
      currency: currentUser.currency,
    };
  },
});
