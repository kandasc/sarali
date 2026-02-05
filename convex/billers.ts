import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel.d.ts";
import { ConvexError } from "convex/values";

// Check if user is Super Admin or Master
async function checkBillerManagementPermission(
  ctx: {
    db: {
      get: (id: Id<"users">) => Promise<{
        role: "SUPER_ADMIN" | "MASTER" | "MANAGER" | "CHEF_AGENCE" | "CAISSIER" | "BILLER";
      } | null>;
    };
  },
  userId: Id<"users">
): Promise<void> {
  const user = await ctx.db.get(userId);
  if (!user || (user.role !== "SUPER_ADMIN" && user.role !== "MASTER")) {
    throw new ConvexError({
      message: "Accès refusé. Seuls les Super Admin et Master peuvent gérer les fournisseurs.",
      code: "FORBIDDEN",
    });
  }
}

// Generate upload URL for logo
export const generateLogoUploadUrl = mutation({
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

    await checkBillerManagementPermission(ctx, user._id);

    return await ctx.storage.generateUploadUrl();
  },
});

// Create biller
export const createBiller = mutation({
  args: {
    name: v.string(),
    code: v.string(),
    category: v.union(
      v.literal("ELECTRICITY"),
      v.literal("WATER"),
      v.literal("INTERNET"),
      v.literal("PHONE"),
      v.literal("TV"),
      v.literal("AIRTIME"),
      v.literal("INSURANCE"),
      v.literal("OTHER")
    ),
    logoStorageId: v.optional(v.id("_storage")),
    description: v.optional(v.string()),
    isActive: v.boolean(),
    supportedCurrencies: v.array(v.string()),
    countries: v.array(v.string()),
    feePercentage: v.optional(v.number()),
    feeFixed: v.optional(v.number()),
    paymentGateway: v.optional(v.union(
      v.literal("SAYELE_GATE"),
      v.literal("MANUAL"),
      v.literal("NONE")
    )),
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

    await checkBillerManagementPermission(ctx, user._id);

    // Check if code already exists
    const existing = await ctx.db
      .query("billers")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();

    if (existing) {
      throw new ConvexError({
        message: "Un fournisseur avec ce code existe déjà",
        code: "CONFLICT",
      });
    }

    const billerId = await ctx.db.insert("billers", {
      name: args.name,
      code: args.code,
      category: args.category,
      logoStorageId: args.logoStorageId,
      description: args.description,
      isActive: args.isActive,
      supportedCurrencies: args.supportedCurrencies,
      countries: args.countries,
      feePercentage: args.feePercentage,
      feeFixed: args.feeFixed,
      paymentGateway: args.paymentGateway,
    });

    return billerId;
  },
});

// Update biller
export const updateBiller = mutation({
  args: {
    billerId: v.id("billers"),
    name: v.optional(v.string()),
    code: v.optional(v.string()),
    category: v.optional(
      v.union(
        v.literal("ELECTRICITY"),
        v.literal("WATER"),
        v.literal("INTERNET"),
        v.literal("PHONE"),
        v.literal("TV"),
        v.literal("AIRTIME"),
        v.literal("INSURANCE"),
        v.literal("OTHER")
      )
    ),
    logoStorageId: v.optional(v.id("_storage")),
    description: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    supportedCurrencies: v.optional(v.array(v.string())),
    countries: v.optional(v.array(v.string())),
    feePercentage: v.optional(v.number()),
    feeFixed: v.optional(v.number()),
    paymentGateway: v.optional(v.union(
      v.literal("SAYELE_GATE"),
      v.literal("MANUAL"),
      v.literal("NONE")
    )),
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

    await checkBillerManagementPermission(ctx, user._id);

    const biller = await ctx.db.get(args.billerId);
    if (!biller) {
      throw new ConvexError({
        message: "Fournisseur non trouvé",
        code: "NOT_FOUND",
      });
    }

    // If code is being changed, check for conflicts
    if (args.code !== undefined && args.code !== biller.code) {
      const existing = await ctx.db
        .query("billers")
        .withIndex("by_code", (q) => q.eq("code", args.code!))
        .first();

      if (existing && existing._id !== args.billerId) {
        throw new ConvexError({
          message: "Un fournisseur avec ce code existe déjà",
          code: "CONFLICT",
        });
      }
    }

    const updates: Record<string, unknown> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.code !== undefined) updates.code = args.code;
    if (args.category !== undefined) updates.category = args.category;
    if (args.logoStorageId !== undefined)
      updates.logoStorageId = args.logoStorageId;
    if (args.description !== undefined) updates.description = args.description;
    if (args.isActive !== undefined) updates.isActive = args.isActive;
    if (args.supportedCurrencies !== undefined)
      updates.supportedCurrencies = args.supportedCurrencies;
    if (args.countries !== undefined) updates.countries = args.countries;
    if (args.feePercentage !== undefined)
      updates.feePercentage = args.feePercentage;
    if (args.feeFixed !== undefined) updates.feeFixed = args.feeFixed;
    if (args.paymentGateway !== undefined)
      updates.paymentGateway = args.paymentGateway;

    await ctx.db.patch(args.billerId, updates);

    return { success: true };
  },
});

// Delete biller
export const deleteBiller = mutation({
  args: {
    billerId: v.id("billers"),
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

    await checkBillerManagementPermission(ctx, user._id);

    await ctx.db.delete(args.billerId);

    return { success: true };
  },
});

// Get all billers (for admin)
export const listAllBillers = query({
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

    await checkBillerManagementPermission(ctx, user._id);

    const billers = await ctx.db.query("billers").collect();

    // Get logo URLs
    const billersWithLogos = [];
    for (const biller of billers) {
      let logoUrl = null;
      if (biller.logoStorageId) {
        logoUrl = await ctx.storage.getUrl(biller.logoStorageId);
      }
      billersWithLogos.push({
        ...biller,
        logoUrl,
      });
    }

    return billersWithLogos;
  },
});

// Get active billers (public - for payment interface)
export const listActiveBillers = query({
  args: {
    category: v.optional(
      v.union(
        v.literal("ELECTRICITY"),
        v.literal("WATER"),
        v.literal("INTERNET"),
        v.literal("PHONE"),
        v.literal("TV"),
        v.literal("AIRTIME"),
        v.literal("INSURANCE"),
        v.literal("OTHER")
      )
    ),
    country: v.optional(v.string()),
    currency: v.optional(v.union(v.literal("XOF"), v.literal("GNF"))),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("billers").withIndex("by_active", (q) => q.eq("isActive", true));

    let billers = await query.collect();

    // Filter by category if provided
    if (args.category) {
      billers = billers.filter((b) => b.category === args.category);
    }

    // Filter by country if provided
    if (args.country !== undefined) {
      billers = billers.filter((b) => b.countries.includes(args.country!));
    }

    // Filter by currency if provided
    if (args.currency !== undefined) {
      billers = billers.filter((b) =>
        b.supportedCurrencies.includes(args.currency!)
      );
    }

    // Get logo URLs
    const billersWithLogos = [];
    for (const biller of billers) {
      let logoUrl = null;
      if (biller.logoStorageId) {
        logoUrl = await ctx.storage.getUrl(biller.logoStorageId);
      }
      billersWithLogos.push({
        ...biller,
        logoUrl,
      });
    }

    return billersWithLogos;
  },
});

// Get biller by ID
export const getBillerById = query({
  args: {
    billerId: v.id("billers"),
  },
  handler: async (ctx, args) => {
    const biller = await ctx.db.get(args.billerId);
    if (!biller) {
      throw new ConvexError({
        message: "Fournisseur non trouvé",
        code: "NOT_FOUND",
      });
    }

    let logoUrl = null;
    if (biller.logoStorageId) {
      logoUrl = await ctx.storage.getUrl(biller.logoStorageId);
    }

    return {
      ...biller,
      logoUrl,
    };
  },
});

// Get all active billers (public - for AI search)
export const listAllActiveBillers = query({
  args: {},
  handler: async (ctx): Promise<Array<{
    _id: string;
    name: string;
    category: string;
    description?: string;
  }>> => {
    const billers = await ctx.db
      .query("billers")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    return billers.map((b) => ({
      _id: b._id,
      name: b.name,
      category: b.category,
      description: b.description,
    }));
  },
});
