import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

// SayeleGate webhook handler
http.route({
  path: "/webhooks/sayele-gate",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const signature = request.headers.get("x-sayele-signature");
    const body = await request.text();

    if (!signature) {
      return new Response(
        JSON.stringify({ error: "Missing signature" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Verify webhook signature
    const isValid = await ctx.runAction(internal.sayeleGate.verifyWebhookSignature, {
      payload: body,
      signature,
    });

    if (!isValid) {
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Parse webhook payload
    let payload: {
      event: string;
      data: {
        payment_id: string;
        status: string;
        transaction_id?: string;
        error_message?: string;
      };
    };

    try {
      payload = JSON.parse(body);
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON payload" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Handle different webhook events
    if (payload.event === "payment.completed") {
      await ctx.runMutation(internal.sayeleGateMutations.updatePaymentFromWebhook, {
        gatewayPaymentId: payload.data.payment_id,
        status: "COMPLETED",
        transactionId: payload.data.transaction_id,
      });
    } else if (payload.event === "payment.failed") {
      await ctx.runMutation(internal.sayeleGateMutations.updatePaymentFromWebhook, {
        gatewayPaymentId: payload.data.payment_id,
        status: "FAILED",
        errorMessage: payload.data.error_message,
      });
    } else if (payload.event === "payment.cancelled") {
      await ctx.runMutation(internal.sayeleGateMutations.updatePaymentFromWebhook, {
        gatewayPaymentId: payload.data.payment_id,
        status: "CANCELLED",
      });
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }),
});

export default http;
