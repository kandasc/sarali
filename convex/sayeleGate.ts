"use node";

import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

const SAYELE_GATE_API_URL = "https://gate.sayele.co/api/v1";

type PaymentIntentResponse = {
  success: boolean;
  data?: {
    payment_id: string;
    checkout_url: string;
    expires_at: string;
  };
  error?: {
    code: string;
    message: string;
  };
};

type PaymentStatusResponse = {
  success: boolean;
  data?: {
    payment_id: string;
    status: "pending" | "processing" | "completed" | "failed" | "cancelled";
    amount: number;
    currency: string;
    reference: string;
    transaction_id?: string;
  };
  error?: {
    code: string;
    message: string;
  };
};

// Create a payment intent with SayeleGate
export const createPaymentIntent = action({
  args: {
    paymentId: v.string(),
    amount: v.number(),
    currency: v.string(),
    customerName: v.string(),
    customerPhone: v.string(),
    customerEmail: v.optional(v.string()),
    description: v.string(),
    reference: v.string(),
    returnUrl: v.string(),
    cancelUrl: v.string(),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    checkoutUrl?: string;
    gatewayPaymentId?: string;
    error?: string;
  }> => {
    const apiKey = process.env.SAYELE_GATE_API_KEY;
    const merchantId = process.env.SAYELE_GATE_MERCHANT_ID;

    if (!apiKey || !merchantId) {
      // If no API keys configured, return error
      return {
        success: false,
        error: "SayeleGate n'est pas configuré. Veuillez ajouter les clés API.",
      };
    }

    try {
      const response = await fetch(`${SAYELE_GATE_API_URL}/payments/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "X-Merchant-ID": merchantId,
        },
        body: JSON.stringify({
          amount: args.amount,
          currency: args.currency,
          customer: {
            name: args.customerName,
            phone: args.customerPhone,
            email: args.customerEmail,
          },
          description: args.description,
          reference: args.reference,
          metadata: {
            internal_payment_id: args.paymentId,
          },
          redirect_urls: {
            success: args.returnUrl,
            cancel: args.cancelUrl,
          },
        }),
      });

      const result = (await response.json()) as PaymentIntentResponse;

      if (!response.ok || !result.success || !result.data) {
        return {
          success: false,
          error: result.error?.message || "Erreur lors de la création du paiement",
        };
      }

      // Update the payment record with gateway info
      await ctx.runMutation(internal.sayeleGateMutations.updatePaymentGatewayInfo, {
        paymentReference: args.reference,
        gatewayPaymentId: result.data.payment_id,
        checkoutUrl: result.data.checkout_url,
      });

      return {
        success: true,
        checkoutUrl: result.data.checkout_url,
        gatewayPaymentId: result.data.payment_id,
      };
    } catch (error) {
      console.error("SayeleGate API error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erreur de connexion au gateway",
      };
    }
  },
});

// Check payment status with SayeleGate
export const checkPaymentStatus = action({
  args: {
    gatewayPaymentId: v.string(),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    status?: string;
    transactionId?: string;
    error?: string;
  }> => {
    const apiKey = process.env.SAYELE_GATE_API_KEY;
    const merchantId = process.env.SAYELE_GATE_MERCHANT_ID;

    if (!apiKey || !merchantId) {
      return {
        success: false,
        error: "SayeleGate n'est pas configuré",
      };
    }

    try {
      const response = await fetch(
        `${SAYELE_GATE_API_URL}/payments/${args.gatewayPaymentId}/status`,
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "X-Merchant-ID": merchantId,
          },
        }
      );

      const result = (await response.json()) as PaymentStatusResponse;

      if (!response.ok || !result.success || !result.data) {
        return {
          success: false,
          error: result.error?.message || "Erreur lors de la vérification du paiement",
        };
      }

      return {
        success: true,
        status: result.data.status,
        transactionId: result.data.transaction_id,
      };
    } catch (error) {
      console.error("SayeleGate status check error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erreur de connexion",
      };
    }
  },
});

// Verify webhook signature
export const verifyWebhookSignature = internalAction({
  args: {
    payload: v.string(),
    signature: v.string(),
  },
  handler: async (_ctx, args): Promise<boolean> => {
    const webhookSecret = process.env.SAYELE_GATE_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      console.error("SAYELE_GATE_WEBHOOK_SECRET not configured");
      return false;
    }

    try {
      // Use crypto to verify HMAC signature
      const crypto = await import("crypto");
      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(args.payload)
        .digest("hex");

      return crypto.timingSafeEqual(
        Buffer.from(args.signature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      console.error("Webhook signature verification error:", error);
      return false;
    }
  },
});
