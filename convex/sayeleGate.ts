"use node";

import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

const SAYELE_GATE_API_URL = "https://gate-api.sayele.co/api/v1";

// SayeleGate checkout URL base
const SAYELE_GATE_CHECKOUT_URL = "https://gate.sayele.co/checkout";

type PaymentIntentResponse = {
  // Response can be either wrapped or direct
  success?: boolean;
  data?: {
    id: string;
    client_secret: string;
    status: string;
  };
  // Or direct fields
  id?: string;
  client_secret?: string;
  status?: string;
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
      const response = await fetch(`${SAYELE_GATE_API_URL}/payment-intents`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "X-Merchant-ID": merchantId,
        },
        body: JSON.stringify({
          amount: args.amount * 100, // SayeleGate expects amounts in smallest unit (centimes)
          currency: args.currency,
          payment_method_types: ["card", "mobile_money"],
          description: args.description,
          customer_name: args.customerName,
          customer_email: args.customerEmail || undefined,
          customer_phone: args.customerPhone,
          return_url: args.returnUrl,
          cancel_url: args.cancelUrl,
          metadata: {
            reference: args.reference,
            internal_payment_id: args.paymentId,
          },
        }),
      });

      // Get raw text first to handle empty responses
      const responseText = await response.text();
      
      // Check if response is empty
      if (!responseText || responseText.trim() === "") {
        console.error("SayeleGate returned empty response, status:", response.status);
        return {
          success: false,
          error: `Réponse vide du serveur de paiement (status: ${response.status})`,
        };
      }

      // Try to parse JSON
      let result: PaymentIntentResponse;
      try {
        result = JSON.parse(responseText) as PaymentIntentResponse;
      } catch (parseError) {
        console.error("Failed to parse SayeleGate response:", responseText.substring(0, 500));
        return {
          success: false,
          error: "Réponse invalide du serveur de paiement",
        };
      }

      // Log the full response for debugging
      console.log("SayeleGate response:", JSON.stringify(result));

      // Handle HTTP errors
      if (!response.ok) {
        return {
          success: false,
          error: result.error?.message || `Erreur HTTP (status: ${response.status})`,
        };
      }

      // Handle different response formats
      // API can return { id, client_secret, ... } directly or wrapped in { data: { id, client_secret, ... } }
      const paymentId = result.data?.id || result.id;
      const clientSecret = result.data?.client_secret || result.client_secret;

      if (!paymentId || !clientSecret) {
        console.error("Missing id or client_secret in response:", JSON.stringify(result));
        return {
          success: false,
          error: "Réponse incomplète du serveur de paiement (id ou client_secret manquant)",
        };
      }

      // Construct checkout URL using client_secret
      const checkoutUrl = `${SAYELE_GATE_CHECKOUT_URL}?client_secret=${encodeURIComponent(clientSecret)}`;
      console.log("Constructed checkout URL:", checkoutUrl);

      // Update the payment record with gateway info
      await ctx.runMutation(internal.sayeleGateMutations.updatePaymentGatewayInfo, {
        paymentReference: args.reference,
        gatewayPaymentId: String(paymentId),
        checkoutUrl: checkoutUrl,
      });

      return {
        success: true,
        checkoutUrl: checkoutUrl,
        gatewayPaymentId: String(paymentId),
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
        `${SAYELE_GATE_API_URL}/payment-intents/${args.gatewayPaymentId}`,
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "X-Merchant-ID": merchantId,
          },
        }
      );

      // Get raw text first to handle empty responses
      const responseText = await response.text();
      
      if (!responseText || responseText.trim() === "") {
        console.error("SayeleGate status check returned empty response, status:", response.status);
        return {
          success: false,
          error: `Réponse vide du serveur (status: ${response.status})`,
        };
      }

      let result: PaymentStatusResponse;
      try {
        result = JSON.parse(responseText) as PaymentStatusResponse;
      } catch (parseError) {
        console.error("Failed to parse SayeleGate status response:", responseText.substring(0, 500));
        return {
          success: false,
          error: "Réponse invalide du serveur de paiement",
        };
      }

      if (!response.ok || !result.success || !result.data) {
        return {
          success: false,
          error: result.error?.message || `Erreur lors de la vérification du paiement (status: ${response.status})`,
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
