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
      v.literal("AIRTIME"),
      v.literal("OTHER")
    ),
    provider: v.string(),
    billerId: v.optional(v.id("billers")),
    billReference: v.string(),
    accountNumber: v.optional(v.string()),
    customerName: v.string(),
    customerPhone: v.string(),
    customerEmail: v.optional(v.string()),
    amount: v.number(),
    currency: v.union(v.literal("XOF"), v.literal("GNF")),
    isTest: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Validate amount
    if (args.amount <= 0) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Le montant doit être supérieur à 0",
      });
    }

    // Get biller info if provided
    let fees = calculateFees(args.amount);
    let paymentGateway: "SAYELE_GATE" | "MANUAL" | "NONE" | undefined;
    
    if (args.billerId) {
      const biller = await ctx.db.get(args.billerId);
      if (biller) {
        // Calculate fees based on biller settings
        const percentageFee = biller.feePercentage
          ? Math.round((args.amount * biller.feePercentage) / 100)
          : 0;
        const fixedFee = biller.feeFixed || 0;
        fees = percentageFee + fixedFee;
        paymentGateway = biller.paymentGateway;
      }
    }

    const totalAmount = args.amount + fees;

    // Generate payment reference
    const paymentReference = generatePaymentReference();

    // Create payment record
    const paymentId = await ctx.db.insert("billPayments", {
      billType: args.billType,
      provider: args.provider,
      billerId: args.billerId,
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
      paymentGateway,
      status: "PENDING",
      isTest: args.isTest ?? false,
    });

    return {
      paymentId,
      paymentReference,
      amount: args.amount,
      fees,
      totalAmount,
      paymentGateway,
    };
  },
});

// Process payment - now returns checkout URL for gateway payments
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

    // If payment has SayeleGate configured, return info for frontend to call action
    if (payment.paymentGateway === "SAYELE_GATE") {
      // Mark as processing
      await ctx.db.patch(args.paymentId, {
        status: "PROCESSING",
      });

      return {
        success: true,
        requiresGateway: true,
        paymentReference: payment.paymentReference,
        gatewayType: "SAYELE_GATE" as const,
        paymentDetails: {
          paymentId: args.paymentId,
          amount: payment.totalAmount,
          currency: payment.currency,
          customerName: payment.customerName,
          customerPhone: payment.customerPhone,
          customerEmail: payment.customerEmail,
          description: `Paiement ${payment.provider} - ${payment.billReference}`,
          reference: payment.paymentReference,
        },
      };
    }

    // For MANUAL or NONE gateway, simulate successful payment
    const saraliTransactionId = `SARALI-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`.toUpperCase();

    await ctx.db.patch(args.paymentId, {
      status: "COMPLETED",
      saraliTransactionId,
    });

    return {
      success: true,
      requiresGateway: false,
      paymentReference: payment.paymentReference,
      saraliTransactionId,
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
      v.literal("AIRTIME"),
      v.literal("OTHER")
    ),
  },
  handler: async (ctx, args) => {
    // TODO: This should be configurable or fetched from Sarali API
    // For now, returning static data based on bill type

    const providers: Record<string, string[]> = {
      ELECTRICITY: ["EDG (Électricité de Guinée)", "CIE (Côte d'Ivoire)", "SENELEC (Sénégal)"],
      WATER: ["SEG (Service des Eaux de Guinée)", "SODECI (Côte d'Ivoire)"],
      INTERNET: ["MTN", "Orange", "Cellcom", "Afribone"],
      PHONE: ["MTN", "Orange", "Cellcom"],
      AIRTIME: ["MTN", "Orange", "Moov", "Free"],
      TV: ["Canal+", "StarTimes", "MyTV"],
      OTHER: ["Autre fournisseur"],
    };

    return providers[args.billType] || [];
  },
});

// Get payment statistics (test vs live)
export const getPaymentStats = query({
  args: {},
  handler: async (ctx) => {
    const allPayments = await ctx.db.query("billPayments").collect();
    
    const testPayments = allPayments.filter(p => p.isTest === true);
    const livePayments = allPayments.filter(p => p.isTest === false);
    const unmarkedPayments = allPayments.filter(p => p.isTest === undefined);
    
    const testTotalAmount = testPayments.reduce((sum, p) => sum + p.totalAmount, 0);
    const liveTotalAmount = livePayments.reduce((sum, p) => sum + p.totalAmount, 0);
    
    const testCompleted = testPayments.filter(p => p.status === "COMPLETED").length;
    const liveCompleted = livePayments.filter(p => p.status === "COMPLETED").length;
    
    return {
      total: allPayments.length,
      test: {
        count: testPayments.length,
        completed: testCompleted,
        totalAmount: testTotalAmount,
      },
      live: {
        count: livePayments.length,
        completed: liveCompleted,
        totalAmount: liveTotalAmount,
      },
      unmarked: unmarkedPayments.length,
    };
  },
});

// List all payments with filtering
export const listPayments = query({
  args: {
    isTest: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let paymentsQuery = ctx.db.query("billPayments").order("desc");
    
    const payments = await paymentsQuery.take(args.limit || 50);
    
    // Filter by isTest if specified
    if (args.isTest !== undefined) {
      return payments.filter(p => p.isTest === args.isTest);
    }
    
    return payments;
  },
});
