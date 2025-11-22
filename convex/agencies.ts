import { ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";

// Helper function to check permissions
async function checkPermission(
  ctx: QueryCtx | MutationCtx,
  requiredRole: string[]
) {
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

// Create agency
export const createAgency = mutation({
  args: {
    name: v.string(),
    code: v.string(),
    country: v.string(),
    city: v.string(),
    address: v.optional(v.string()),
    phone: v.optional(v.string()),
    managerId: v.optional(v.id("users")),
    networkManagerId: v.optional(v.id("users")),
    currency: v.union(v.literal("XOF"), v.literal("GNF")),
  },
  handler: async (ctx, args) => {
    const currentUser = await checkPermission(ctx, ["MASTER", "MANAGER"]);

    // Check if code already exists
    const existingAgency = await ctx.db
      .query("agencies")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .unique();

    if (existingAgency) {
      throw new ConvexError({
        code: "CONFLICT",
        message: "Agency code already exists",
      });
    }

    const agencyId = await ctx.db.insert("agencies", {
      name: args.name,
      code: args.code,
      country: args.country,
      city: args.city,
      address: args.address,
      phone: args.phone,
      managerId: args.managerId,
      networkManagerId: args.networkManagerId || currentUser._id,
      creditBalance: 0,
      currency: args.currency,
      status: "ACTIVE",
    });

    return agencyId;
  },
});

// List agencies
export const listAgencies = query({
  args: {
    status: v.optional(v.union(v.literal("ACTIVE"), v.literal("INACTIVE"))),
    managerId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const currentUser = await checkPermission(ctx, [
      "MASTER",
      "MANAGER",
      "CHEF_AGENCE",
    ]);

    let agencies = await ctx.db.query("agencies").collect();

    // Filter by current user role
    if (currentUser.role === "MANAGER") {
      agencies = agencies.filter(
        (a) => a.networkManagerId === currentUser._id
      );
    } else if (currentUser.role === "CHEF_AGENCE") {
      agencies = agencies.filter((a) => a.managerId === currentUser._id);
    }

    // Filter by status
    if (args.status) {
      agencies = agencies.filter((a) => a.status === args.status);
    }

    // Filter by manager
    if (args.managerId) {
      agencies = agencies.filter((a) => a.managerId === args.managerId);
    }

    // Enrich with manager data
    const enrichedAgencies = await Promise.all(
      agencies.map(async (agency) => {
        let manager = null;
        if (agency.managerId) {
          manager = await ctx.db.get(agency.managerId);
        }

        let networkManager = null;
        if (agency.networkManagerId) {
          networkManager = await ctx.db.get(agency.networkManagerId);
        }

        // Count users in agency
        const users = await ctx.db
          .query("users")
          .withIndex("by_agency", (q) => q.eq("agencyId", agency._id))
          .collect();

        return {
          ...agency,
          manager,
          networkManager,
          userCount: users.length,
        };
      })
    );

    return enrichedAgencies;
  },
});

// Get agency by ID
export const getAgencyById = query({
  args: { agencyId: v.id("agencies") },
  handler: async (ctx, args) => {
    await checkPermission(ctx, ["MASTER", "MANAGER", "CHEF_AGENCE"]);

    const agency = await ctx.db.get(args.agencyId);
    if (!agency) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Agency not found",
      });
    }

    let manager = null;
    if (agency.managerId) {
      manager = await ctx.db.get(agency.managerId);
    }

    let networkManager = null;
    if (agency.networkManagerId) {
      networkManager = await ctx.db.get(agency.networkManagerId);
    }

    // Get users in this agency
    const users = await ctx.db
      .query("users")
      .withIndex("by_agency", (q) => q.eq("agencyId", args.agencyId))
      .collect();

    return {
      ...agency,
      manager,
      networkManager,
      users,
    };
  },
});

// Update agency
export const updateAgency = mutation({
  args: {
    agencyId: v.id("agencies"),
    name: v.optional(v.string()),
    country: v.optional(v.string()),
    city: v.optional(v.string()),
    address: v.optional(v.string()),
    phone: v.optional(v.string()),
    managerId: v.optional(v.id("users")),
    status: v.optional(v.union(v.literal("ACTIVE"), v.literal("INACTIVE"))),
  },
  handler: async (ctx, args) => {
    await checkPermission(ctx, ["MASTER", "MANAGER"]);

    const agency = await ctx.db.get(args.agencyId);
    if (!agency) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Agency not found",
      });
    }

    const updates: Record<string, unknown> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.country !== undefined) updates.country = args.country;
    if (args.city !== undefined) updates.city = args.city;
    if (args.address !== undefined) updates.address = args.address;
    if (args.phone !== undefined) updates.phone = args.phone;
    if (args.managerId !== undefined) updates.managerId = args.managerId;
    if (args.status !== undefined) updates.status = args.status;

    await ctx.db.patch(args.agencyId, updates);

    return args.agencyId;
  },
});

// Get agency statistics
export const getAgencyStats = query({
  args: { agencyId: v.id("agencies") },
  handler: async (ctx, args) => {
    await checkPermission(ctx, ["MASTER", "MANAGER", "CHEF_AGENCE"]);

    const agency = await ctx.db.get(args.agencyId);
    if (!agency) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Agency not found",
      });
    }

    // Count users by role
    const allUsers = await ctx.db
      .query("users")
      .withIndex("by_agency", (q) => q.eq("agencyId", args.agencyId))
      .collect();

    const activeUsers = allUsers.filter((u) => u.status === "ACTIVE");
    const chefs = allUsers.filter((u) => u.role === "CHEF_AGENCE");
    const caissiers = allUsers.filter((u) => u.role === "CAISSIER");

    // Calculate total user credit
    const totalUserCredit = activeUsers.reduce(
      (sum, user) => sum + user.creditBalance,
      0
    );

    return {
      totalUsers: allUsers.length,
      activeUsers: activeUsers.length,
      chefs: chefs.length,
      caissiers: caissiers.length,
      agencyCreditBalance: agency.creditBalance,
      totalUserCredit,
      currency: agency.currency,
    };
  },
});

// Get agency branding by code (public - for white-label payment page)
export const getAgencyBranding = query({
  args: {
    agencyCode: v.string(),
  },
  handler: async (ctx, args) => {
    const agency = await ctx.db
      .query("agencies")
      .withIndex("by_code", (q) => q.eq("code", args.agencyCode))
      .first();

    if (!agency || agency.status !== "ACTIVE") {
      return null;
    }

    let brandLogoUrl = null;
    if (agency.brandLogoStorageId) {
      brandLogoUrl = await ctx.storage.getUrl(agency.brandLogoStorageId);
    }

    return {
      agencyId: agency._id,
      name: agency.name,
      brandName: agency.brandName || agency.name,
      brandLogoUrl,
      brandPrimaryColor: agency.brandPrimaryColor,
      brandWebsite: agency.brandWebsite,
    };
  },
});

// Generate upload URL for agency brand logo
export const generateBrandLogoUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await checkPermission(ctx, ["MASTER", "MANAGER", "CHEF_AGENCE"]);
    return await ctx.storage.generateUploadUrl();
  },
});

// Update agency branding
export const updateAgencyBranding = mutation({
  args: {
    agencyId: v.id("agencies"),
    brandName: v.optional(v.string()),
    brandLogoStorageId: v.optional(v.id("_storage")),
    brandPrimaryColor: v.optional(v.string()),
    brandWebsite: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await checkPermission(ctx, ["MASTER", "MANAGER", "CHEF_AGENCE"]);

    // Check if user has access to this agency
    if (
      user.role === "CHEF_AGENCE" &&
      user.agencyId?.toString() !== args.agencyId.toString()
    ) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "You can only update your own agency's branding",
      });
    }

    const updates: Record<string, unknown> = {};
    if (args.brandName !== undefined) updates.brandName = args.brandName;
    if (args.brandLogoStorageId !== undefined)
      updates.brandLogoStorageId = args.brandLogoStorageId;
    if (args.brandPrimaryColor !== undefined)
      updates.brandPrimaryColor = args.brandPrimaryColor;
    if (args.brandWebsite !== undefined)
      updates.brandWebsite = args.brandWebsite;

    await ctx.db.patch(args.agencyId, updates);

    return { success: true };
  },
});
