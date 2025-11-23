import { ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel.d.ts";

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

// Create a new user
export const createUser = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    role: v.union(
      v.literal("MANAGER"),
      v.literal("CHEF_AGENCE"),
      v.literal("CAISSIER")
    ),
    agencyId: v.optional(v.id("agencies")),
    managerId: v.optional(v.id("users")),
    currency: v.union(v.literal("XOF"), v.literal("GNF")),
  },
  handler: async (ctx, args) => {
    const currentUser = await checkPermission(ctx, [
      "SUPER_ADMIN",
      "MASTER",
      "MANAGER",
      "CHEF_AGENCE",
    ]);

    // Validate hierarchy
    if (currentUser.role === "CHEF_AGENCE" && args.role !== "CAISSIER") {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Chef d'agence can only create caissiers",
      });
    }

    if (currentUser.role === "MANAGER" && args.role === "MANAGER") {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Manager cannot create other managers",
      });
    }

    // Generate temporary token identifier
    const tempToken = `temp_${Date.now()}_${Math.random()}`;

    const userId = await ctx.db.insert("users", {
      name: args.name,
      email: args.email,
      phone: args.phone,
      role: args.role,
      agencyId: args.agencyId,
      managerId: args.managerId || currentUser._id,
      tokenIdentifier: tempToken,
      status: "ACTIVE",
      creditBalance: 0,
      currency: args.currency,
      createdBy: currentUser._id,
    });

    await logActivity(
      ctx,
      currentUser._id,
      "CREATE_USER",
      "users",
      userId,
      `Created user ${args.name} with role ${args.role}`
    );

    return userId;
  },
});

// Get all users (filtered by permissions)
export const listUsers = query({
  args: {
    role: v.optional(
      v.union(
        v.literal("MASTER"),
        v.literal("MANAGER"),
        v.literal("CHEF_AGENCE"),
        v.literal("CAISSIER")
      )
    ),
    agencyId: v.optional(v.id("agencies")),
    status: v.optional(v.union(v.literal("ACTIVE"), v.literal("INACTIVE"))),
  },
  handler: async (ctx, args) => {
    const currentUser = await checkPermission(ctx, [
      "SUPER_ADMIN",
      "MASTER",
      "MANAGER",
      "CHEF_AGENCE",
    ]);

    // Fetch users based on role filter
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

    // Apply hierarchy filters (SUPER_ADMIN sees all)
    if (currentUser.role === "CHEF_AGENCE") {
      users = users.filter((u) => u.agencyId === currentUser.agencyId);
    } else if (currentUser.role === "MANAGER") {
      users = users.filter(
        (u) => u.managerId === currentUser._id || u._id === currentUser._id
      );
    } else if (currentUser.role === "MASTER") {
      // MASTER sees all except SUPER_ADMIN
      users = users.filter((u) => u.role !== "SUPER_ADMIN");
    }

    // Filter by agency
    if (args.agencyId) {
      users = users.filter((u) => u.agencyId === args.agencyId);
    }

    // Filter by status
    if (args.status) {
      users = users.filter((u) => u.status === args.status);
    }

    return users;
  },
});

// Get user by ID with agency details
export const getUserById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await checkPermission(ctx, ["SUPER_ADMIN", "MASTER", "MANAGER", "CHEF_AGENCE"]);

    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    let agency = null;
    if (user.agencyId) {
      agency = await ctx.db.get(user.agencyId);
    }

    let manager = null;
    if (user.managerId) {
      manager = await ctx.db.get(user.managerId);
    }

    return { ...user, agency, manager };
  },
});

// Update user
export const updateUser = mutation({
  args: {
    userId: v.id("users"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    role: v.optional(
      v.union(
        v.literal("MANAGER"),
        v.literal("CHEF_AGENCE"),
        v.literal("CAISSIER")
      )
    ),
    agencyId: v.optional(v.id("agencies")),
    status: v.optional(v.union(v.literal("ACTIVE"), v.literal("INACTIVE"))),
  },
  handler: async (ctx, args) => {
    const currentUser = await checkPermission(ctx, [
      "SUPER_ADMIN",
      "MASTER",
      "MANAGER",
      "CHEF_AGENCE",
    ]);

    const userToUpdate = await ctx.db.get(args.userId);
    if (!userToUpdate) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    // Prevent self-modification of role
    if (args.role && currentUser._id === args.userId) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Cannot modify your own role",
      });
    }

    const updates: Record<string, unknown> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.email !== undefined) updates.email = args.email;
    if (args.phone !== undefined) updates.phone = args.phone;
    if (args.role !== undefined) updates.role = args.role;
    if (args.agencyId !== undefined) updates.agencyId = args.agencyId;
    if (args.status !== undefined) updates.status = args.status;

    await ctx.db.patch(args.userId, updates);

    await logActivity(
      ctx,
      currentUser._id,
      "UPDATE_USER",
      "users",
      args.userId,
      `Updated user ${userToUpdate.name}`
    );

    return args.userId;
  },
});

// Deactivate user
export const deactivateUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const currentUser = await checkPermission(ctx, ["SUPER_ADMIN", "MASTER", "MANAGER"]);

    if (currentUser._id === args.userId) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Cannot deactivate yourself",
      });
    }

    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    await ctx.db.patch(args.userId, { status: "INACTIVE" });

    await logActivity(
      ctx,
      currentUser._id,
      "DEACTIVATE_USER",
      "users",
      args.userId,
      `Deactivated user ${user.name}`
    );

    return args.userId;
  },
});

// Get activity logs
export const getActivityLogs = query({
  args: {
    userId: v.optional(v.id("users")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await checkPermission(ctx, ["SUPER_ADMIN", "MASTER", "MANAGER", "CHEF_AGENCE"]);

    let logs;
    if (args.userId !== undefined) {
      const userId = args.userId;
      logs = await ctx.db
        .query("activityLogs")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .order("desc")
        .take(args.limit || 50);
    } else {
      logs = await ctx.db
        .query("activityLogs")
        .order("desc")
        .take(args.limit || 50);
    }

    // Enrich with user data
    const enrichedLogs = await Promise.all(
      logs.map(async (log) => {
        const user = await ctx.db.get(log.userId);
        return {
          ...log,
          user,
        };
      })
    );

    return enrichedLogs;
  },
});
