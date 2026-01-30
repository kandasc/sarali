import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Update payment with gateway info after creating payment intent
export const updatePaymentGatewayInfo = internalMutation({
  args: {
    paymentReference: v.string(),
    gatewayPaymentId: v.string(),
    checkoutUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const payment = await ctx.db
      .query("billPayments")
      .withIndex("by_reference", (q) => q.eq("paymentReference", args.paymentReference))
      .unique();

    if (payment) {
      await ctx.db.patch(payment._id, {
        gatewayPaymentId: args.gatewayPaymentId,
        gatewayCheckoutUrl: args.checkoutUrl,
        status: "PROCESSING",
      });
    }
  },
});

// Update payment status from webhook
export const updatePaymentFromWebhook = internalMutation({
  args: {
    gatewayPaymentId: v.string(),
    status: v.union(
      v.literal("COMPLETED"),
      v.literal("FAILED"),
      v.literal("CANCELLED")
    ),
    transactionId: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const payment = await ctx.db
      .query("billPayments")
      .withIndex("by_gateway_payment", (q) => q.eq("gatewayPaymentId", args.gatewayPaymentId))
      .unique();

    if (payment) {
      await ctx.db.patch(payment._id, {
        status: args.status,
        saraliTransactionId: args.transactionId,
        errorMessage: args.errorMessage,
      });
    }
  },
});

// Mark payment as failed
export const markPaymentFailed = internalMutation({
  args: {
    paymentReference: v.string(),
    errorMessage: v.string(),
  },
  handler: async (ctx, args) => {
    const payment = await ctx.db
      .query("billPayments")
      .withIndex("by_reference", (q) => q.eq("paymentReference", args.paymentReference))
      .unique();

    if (payment) {
      await ctx.db.patch(payment._id, {
        status: "FAILED",
        errorMessage: args.errorMessage,
      });
    }
  },
});
