import { ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Generate unique payment reference
function generatePaymentReference(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `PAY-${timestamp}-${random}`.toUpperCase();
}

// Calculate fees (2% for bill payments)
function calculateFees(amount: number): number {
  return Math.round(amount * 0.02);
}

// Initialize bill payment
export const initiateBillPayment = mutation({
  args: {
    billType: v.union(
      v.literal("ELECTRICITY"),
      v.literal("WATER"),
      v.literal("INTERNET"),
      v.literal("PHONE"),
      v.literal("TV"),
      v.literal("OTHER")
    ),
    provider: v.string(),
    billReference: v.string(),
    accountNumber: v.optional(v.string()),
    customerName: v.string(),
    customerPhone: v.string(),
    customerEmail: v.optional(v.string()),
    amount: v.number(),
    currency: v.union(v.literal("XOF"), v.literal("GNF")),
  },
  handler: async (ctx, args) => {
    // Validate amount
    if (args.amount <= 0) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Le montant doit être supérieur à 0",
      });
    }

    // Calculate fees and total
    const fees = calculateFees(args.amount);
    const totalAmount = args.amount + fees;

    // Generate payment reference
    const paymentReference = generatePaymentReference();

    // Create payment record
    const paymentId = await ctx.db.insert("billPayments", {
      billType: args.billType,
      provider: args.provider,
      billReference: args.billReference,
      accountNumber: args.accountNumber,
      customerName: args.customerName,
      customerPhone: args.customerPhone,
      customerEmail: args.customerEmail,
      amount: args.amount,
      currency: args.currency,
      fees,
      totalAmount,
      paymentReference,
      status: "PENDING",
    });

    return {
      paymentId,
      paymentReference,
      amount: args.amount,
      fees,
      totalAmount,
    };
  },
});

// Process payment with SAYELE gate
// NOTE: This is a placeholder. Replace with actual SAYELE API integration
export const processBillPayment = mutation({
  args: {
    paymentId: v.id("billPayments"),
  },
  handler: async (ctx, args) => {
    const payment = await ctx.db.get(args.paymentId);

    if (!payment) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Paiement non trouvé",
      });
    }

    if (payment.status !== "PENDING") {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Le paiement a déjà été traité",
      });
    }

    // Update to processing
    await ctx.db.patch(args.paymentId, {
      status: "PROCESSING",
    });

    // TODO: Integrate with SAYELE gate API here
    // For now, we'll simulate a successful payment
    // In production, this should be replaced with actual API calls to SAYELE

    // Simulate SAYELE transaction ID
    const sayeleTransactionId = `SAYELE-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`.toUpperCase();

    // Update payment as completed
    await ctx.db.patch(args.paymentId, {
      status: "COMPLETED",
      sayeleTransactionId,
    });

    return {
      success: true,
      paymentReference: payment.paymentReference,
      sayeleTransactionId,
    };
  },
});

// Get payment by reference
export const getPaymentByReference = query({
  args: {
    paymentReference: v.string(),
  },
  handler: async (ctx, args) => {
    const payment = await ctx.db
      .query("billPayments")
      .withIndex("by_reference", (q) =>
        q.eq("paymentReference", args.paymentReference)
      )
      .unique();

    if (!payment) {
      return null;
    }

    return payment;
  },
});

// Get payment by ID
export const getPaymentById = query({
  args: {
    paymentId: v.id("billPayments"),
  },
  handler: async (ctx, args) => {
    const payment = await ctx.db.get(args.paymentId);
    return payment;
  },
});

// Get customer payment history
export const getCustomerPayments = query({
  args: {
    customerPhone: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const payments = await ctx.db
      .query("billPayments")
      .withIndex("by_phone", (q) => q.eq("customerPhone", args.customerPhone))
      .order("desc")
      .take(args.limit || 20);

    return payments;
  },
});

// List bill providers (for dropdown)
export const getBillProviders = query({
  args: {
    billType: v.union(
      v.literal("ELECTRICITY"),
      v.literal("WATER"),
      v.literal("INTERNET"),
      v.literal("PHONE"),
      v.literal("TV"),
      v.literal("OTHER")
    ),
  },
  handler: async (ctx, args) => {
    // TODO: This should be configurable or fetched from SAYELE API
    // For now, returning static data based on bill type

    const providers: Record<string, string[]> = {
      ELECTRICITY: ["EDG (Électricité de Guinée)", "CIE (Côte d'Ivoire)", "SENELEC (Sénégal)"],
      WATER: ["SEG (Service des Eaux de Guinée)", "SODECI (Côte d'Ivoire)"],
      INTERNET: ["MTN", "Orange", "Cellcom", "Afribone"],
      PHONE: ["MTN", "Orange", "Cellcom"],
      TV: ["Canal+", "StarTimes", "MyTV"],
      OTHER: ["Autre fournisseur"],
    };

    return providers[args.billType] || [];
  },
});
