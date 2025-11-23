import { ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel.d.ts";

// Helper function to check if user is super admin
async function checkSuperAdmin(ctx: QueryCtx | MutationCtx) {
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

  if (!user || user.role !== "SUPER_ADMIN") {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: "Super admin access required",
    });
  }

  return user;
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

// Create a MASTER user (only super admin can do this)
export const createMaster = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    currency: v.union(v.literal("XOF"), v.literal("GNF")),
  },
  handler: async (ctx, args) => {
    const superAdmin = await checkSuperAdmin(ctx);

    // Generate temporary token identifier
    const tempToken = `temp_${Date.now()}_${Math.random()}`;

    const userId = await ctx.db.insert("users", {
      name: args.name,
      email: args.email,
      phone: args.phone,
      role: "MASTER",
      tokenIdentifier: tempToken,
      status: "ACTIVE",
      creditBalance: 0,
      currency: args.currency,
      createdBy: superAdmin._id,
    });

    await logActivity(
      ctx,
      superAdmin._id,
      "CREATE_MASTER",
      "users",
      userId,
      `Created MASTER user ${args.name}`
    );

    return userId;
  },
});

// Get all users including MASTER
export const listAllUsers = query({
  args: {
    role: v.optional(
      v.union(
        v.literal("SUPER_ADMIN"),
        v.literal("MASTER"),
        v.literal("MANAGER"),
        v.literal("CHEF_AGENCE"),
        v.literal("CAISSIER")
      )
    ),
    status: v.optional(v.union(v.literal("ACTIVE"), v.literal("INACTIVE"))),
  },
  handler: async (ctx, args) => {
    await checkSuperAdmin(ctx);

    let users;
    if (args.role !== undefined) {
      const role = args.role;
      users = await ctx.db
        .query("users")
        .withIndex("by_role", (q) => q.eq("role", role))
        .collect();
    } else {
      users = await ctx.db.query("users").collect();
    }

    // Filter by status
    if (args.status) {
      users = users.filter((u) => u.status === args.status);
    }

    return users;
  },
});

// Update any user (including MASTER)
export const updateAnyUser = mutation({
  args: {
    userId: v.id("users"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    role: v.optional(
      v.union(
        v.literal("MASTER"),
        v.literal("MANAGER"),
        v.literal("CHEF_AGENCE"),
        v.literal("CAISSIER")
      )
    ),
    status: v.optional(v.union(v.literal("ACTIVE"), v.literal("INACTIVE"))),
  },
  handler: async (ctx, args) => {
    const superAdmin = await checkSuperAdmin(ctx);

    const userToUpdate = await ctx.db.get(args.userId);
    if (!userToUpdate) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    const updates: Record<string, unknown> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.email !== undefined) updates.email = args.email;
    if (args.phone !== undefined) updates.phone = args.phone;
    if (args.role !== undefined) updates.role = args.role;
    if (args.status !== undefined) updates.status = args.status;

    await ctx.db.patch(args.userId, updates);

    await logActivity(
      ctx,
      superAdmin._id,
      "UPDATE_USER",
      "users",
      args.userId,
      `Updated user ${userToUpdate.name}`
    );

    return args.userId;
  },
});

// Delete user (only super admin)
export const deleteUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const superAdmin = await checkSuperAdmin(ctx);

    if (superAdmin._id === args.userId) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Cannot delete yourself",
      });
    }

    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    await ctx.db.delete(args.userId);

    await logActivity(
      ctx,
      superAdmin._id,
      "DELETE_USER",
      "users",
      args.userId,
      `Deleted user ${user.name}`
    );

    return args.userId;
  },
});

// Get system statistics
export const getSystemStats = query({
  args: {},
  handler: async (ctx) => {
    await checkSuperAdmin(ctx);

    const allUsers = await ctx.db.query("users").collect();
    const allAgencies = await ctx.db.query("agencies").collect();
    const allBillers = await ctx.db.query("billers").collect();
    const allTransactions = await ctx.db.query("transactions").collect();
    const allBillPayments = await ctx.db.query("billPayments").collect();

    const usersByRole = {
      SUPER_ADMIN: allUsers.filter((u) => u.role === "SUPER_ADMIN").length,
      MASTER: allUsers.filter((u) => u.role === "MASTER").length,
      MANAGER: allUsers.filter((u) => u.role === "MANAGER").length,
      CHEF_AGENCE: allUsers.filter((u) => u.role === "CHEF_AGENCE").length,
      CAISSIER: allUsers.filter((u) => u.role === "CAISSIER").length,
    };

    const totalTransactionVolume = allTransactions.reduce(
      (sum, t) => sum + t.totalAmount,
      0
    );
    const totalBillPaymentVolume = allBillPayments.reduce(
      (sum, p) => sum + p.totalAmount,
      0
    );

    return {
      totalUsers: allUsers.length,
      activeUsers: allUsers.filter((u) => u.status === "ACTIVE").length,
      totalAgencies: allAgencies.length,
      activeAgencies: allAgencies.filter((a) => a.status === "ACTIVE").length,
      totalBillers: allBillers.length,
      activeBillers: allBillers.filter((b) => b.isActive).length,
      totalTransactions: allTransactions.length,
      totalBillPayments: allBillPayments.length,
      usersByRole,
      totalTransactionVolume,
      totalBillPaymentVolume,
      totalVolume: totalTransactionVolume + totalBillPaymentVolume,
    };
  },
});
