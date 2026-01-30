import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel.d.ts";
import { ConvexError } from "convex/values";

// Helper function to generate batch reference
function generateBatchReference(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `BULK-${timestamp}-${random}`.toUpperCase();
}

// Helper function to generate payment reference
function generatePaymentReference(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `PAY-${timestamp}-${random}`.toUpperCase();
}

// Check if user has permission for bulk payments
async function checkBulkPaymentPermission(
  ctx: {
    db: {
      get: (id: Id<"users">) => Promise<{
        role: "SUPER_ADMIN" | "MASTER" | "MANAGER" | "CHEF_AGENCE" | "CAISSIER" | "BILLER";
      } | null>;
    };
    auth: {
      getUserIdentity: () => Promise<{ tokenIdentifier: string } | null>;
    };
  },
  userId: Id<"users">
): Promise<void> {
  const user = await ctx.db.get(userId);
  if (!user || (user.role !== "MASTER" && user.role !== "CAISSIER")) {
    throw new ConvexError({
      message: "Accès refusé. Seuls le Master et les Caissiers peuvent gérer les paiements de masse.",
      code: "FORBIDDEN",
    });
  }
}

// Generate upload URL for CSV file
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        message: "Non authentifié",
        code: "UNAUTHENTICATED",
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
        message: "Utilisateur non trouvé",
        code: "NOT_FOUND",
      });
    }

    await checkBulkPaymentPermission(ctx, user._id);

    return await ctx.storage.generateUploadUrl();
  },
});

// Create bulk payment batch
export const createBulkPayment = mutation({
  args: {
    fileName: v.string(),
    fileStorageId: v.optional(v.id("_storage")),
    items: v.array(
      v.object({
        recipientName: v.string(),
        recipientPhone: v.string(),
        recipientAccount: v.optional(v.string()),
        amount: v.number(),
        description: v.optional(v.string()),
      })
    ),
    currency: v.union(v.literal("XOF"), v.literal("GNF")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        message: "Non authentifié",
        code: "UNAUTHENTICATED",
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
        message: "Utilisateur non trouvé",
        code: "NOT_FOUND",
      });
    }

    await checkBulkPaymentPermission(ctx, user._id);

    // Calculate total amount
    const totalAmount = args.items.reduce((sum, item) => sum + item.amount, 0);

    // Create bulk payment record
    const batchReference = generateBatchReference();
    const bulkPaymentId = await ctx.db.insert("bulkPayments", {
      batchReference,
      fileName: args.fileName,
      fileStorageId: args.fileStorageId,
      totalItems: args.items.length,
      totalAmount,
      currency: args.currency,
      processedItems: 0,
      successfulItems: 0,
      failedItems: 0,
      status: "PENDING",
      createdBy: user._id,
    });

    // Create individual payment items
    for (let i = 0; i < args.items.length; i++) {
      const item = args.items[i];
      await ctx.db.insert("bulkPaymentItems", {
        bulkPaymentId,
        rowNumber: i + 1,
        recipientName: item.recipientName,
        recipientPhone: item.recipientPhone,
        recipientAccount: item.recipientAccount,
        amount: item.amount,
        currency: args.currency,
        reference: generatePaymentReference(),
        description: item.description,
        status: "PENDING",
      });
    }

    return { bulkPaymentId, batchReference };
  },
});

// Process bulk payment (this will be connected to Sarali API later)
export const processBulkPayment = mutation({
  args: {
    bulkPaymentId: v.id("bulkPayments"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        message: "Non authentifié",
        code: "UNAUTHENTICATED",
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
        message: "Utilisateur non trouvé",
        code: "NOT_FOUND",
      });
    }

    await checkBulkPaymentPermission(ctx, user._id);

    const bulkPayment = await ctx.db.get(args.bulkPaymentId);
    if (!bulkPayment) {
      throw new ConvexError({
        message: "Lot de paiement non trouvé",
        code: "NOT_FOUND",
      });
    }

    if (bulkPayment.status !== "PENDING") {
      throw new ConvexError({
        message: "Ce lot a déjà été traité",
        code: "BAD_REQUEST",
      });
    }

    // Update status to processing
    await ctx.db.patch(args.bulkPaymentId, {
      status: "PROCESSING",
      processedAt: Date.now(),
    });

    // TODO: Integrate with Sarali API
    // For now, just mark all items as completed
    const items = await ctx.db
      .query("bulkPaymentItems")
      .withIndex("by_bulk_payment", (q) =>
        q.eq("bulkPaymentId", args.bulkPaymentId)
      )
      .collect();

    let successfulCount = 0;
    let failedCount = 0;

    for (const item of items) {
      // Simulate API call (replace with actual Sarali API integration)
      const success = Math.random() > 0.1; // 90% success rate for simulation

      if (success) {
        await ctx.db.patch(item._id, {
          status: "COMPLETED",
          processedAt: Date.now(),
          transactionId: `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`,
        });
        successfulCount++;
      } else {
        await ctx.db.patch(item._id, {
          status: "FAILED",
          processedAt: Date.now(),
          errorMessage: "Erreur de simulation - À remplacer par l'intégration réelle",
        });
        failedCount++;
      }
    }

    // Update bulk payment with results
    await ctx.db.patch(args.bulkPaymentId, {
      status: failedCount === items.length ? "FAILED" : "COMPLETED",
      processedItems: items.length,
      successfulItems: successfulCount,
      failedItems: failedCount,
    });

    return {
      success: true,
      totalItems: items.length,
      successfulItems: successfulCount,
      failedItems: failedCount,
    };
  },
});

// Get bulk payments list
export const listBulkPayments = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        message: "Non authentifié",
        code: "UNAUTHENTICATED",
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
        message: "Utilisateur non trouvé",
        code: "NOT_FOUND",
      });
    }

    await checkBulkPaymentPermission(ctx, user._id);

    const bulkPayments = await ctx.db
      .query("bulkPayments")
      .order("desc")
      .take(100);

    const result = [];
    for (const bp of bulkPayments) {
      const creator = await ctx.db.get(bp.createdBy);
      result.push({
        ...bp,
        creatorName: creator?.name || "Inconnu",
      });
    }

    return result;
  },
});

// Get bulk payment details with items
export const getBulkPaymentDetails = query({
  args: {
    bulkPaymentId: v.id("bulkPayments"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        message: "Non authentifié",
        code: "UNAUTHENTICATED",
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
        message: "Utilisateur non trouvé",
        code: "NOT_FOUND",
      });
    }

    await checkBulkPaymentPermission(ctx, user._id);

    const bulkPayment = await ctx.db.get(args.bulkPaymentId);
    if (!bulkPayment) {
      throw new ConvexError({
        message: "Lot de paiement non trouvé",
        code: "NOT_FOUND",
      });
    }

    const items = await ctx.db
      .query("bulkPaymentItems")
      .withIndex("by_bulk_payment", (q) =>
        q.eq("bulkPaymentId", args.bulkPaymentId)
      )
      .collect();

    const creator = await ctx.db.get(bulkPayment.createdBy);

    return {
      ...bulkPayment,
      creatorName: creator?.name || "Inconnu",
      items,
    };
  },
});

// Cancel bulk payment
export const cancelBulkPayment = mutation({
  args: {
    bulkPaymentId: v.id("bulkPayments"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        message: "Non authentifié",
        code: "UNAUTHENTICATED",
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
        message: "Utilisateur non trouvé",
        code: "NOT_FOUND",
      });
    }

    await checkBulkPaymentPermission(ctx, user._id);

    const bulkPayment = await ctx.db.get(args.bulkPaymentId);
    if (!bulkPayment) {
      throw new ConvexError({
        message: "Lot de paiement non trouvé",
        code: "NOT_FOUND",
      });
    }

    if (bulkPayment.status !== "PENDING") {
      throw new ConvexError({
        message: "Seuls les paiements en attente peuvent être annulés",
        code: "BAD_REQUEST",
      });
    }

    await ctx.db.patch(args.bulkPaymentId, {
      status: "CANCELLED",
    });

    return { success: true };
  },
});
