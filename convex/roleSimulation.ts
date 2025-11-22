import { ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel.d.ts";

// Start role simulation
export const startSimulation = mutation({
  args: {
    simulatedRole: v.union(
      v.literal("MANAGER"),
      v.literal("CHEF_AGENCE"),
      v.literal("CAISSIER")
    ),
    targetUserId: v.optional(v.id("users")),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHENTICATED",
        message: "User not logged in",
      });
    }

    const master = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!master || master.role !== "MASTER") {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Only MASTER users can simulate roles",
      });
    }

    // End any existing active simulation
    const existingSessions = await ctx.db
      .query("roleSimulations")
      .withIndex("by_master", (q) => q.eq("masterUserId", master._id))
      .filter((q) => q.eq(q.field("endedAt"), undefined))
      .collect();

    for (const session of existingSessions) {
      await ctx.db.patch(session._id, {
        endedAt: Date.now(),
      });
    }

    // Verify target user if provided
    if (args.targetUserId) {
      const targetUser = await ctx.db.get(args.targetUserId);
      if (!targetUser) {
        throw new ConvexError({
          code: "NOT_FOUND",
          message: "Target user not found",
        });
      }

      if (targetUser.role !== args.simulatedRole) {
        throw new ConvexError({
          code: "BAD_REQUEST",
          message: "Target user role does not match simulated role",
        });
      }
    }

    // Create new simulation session
    const sessionId = await ctx.db.insert("roleSimulations", {
      masterUserId: master._id,
      simulatedRole: args.simulatedRole,
      targetUserId: args.targetUserId,
      reason: args.reason,
      startedAt: Date.now(),
    });

    // Log activity
    await ctx.db.insert("activityLogs", {
      userId: master._id,
      action: "START_ROLE_SIMULATION",
      entityType: "roleSimulations",
      entityId: sessionId,
      details: `Started simulating ${args.simulatedRole}${args.targetUserId ? ` (User: ${args.targetUserId})` : ""}`,
    });

    return { sessionId, simulatedRole: args.simulatedRole };
  },
});

// End role simulation
export const endSimulation = mutation({
  args: {
    sessionId: v.id("roleSimulations"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHENTICATED",
        message: "User not logged in",
      });
    }

    const master = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!master || master.role !== "MASTER") {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Only MASTER users can end simulations",
      });
    }

    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Session not found",
      });
    }

    if (session.masterUserId !== master._id) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Cannot end another user's simulation",
      });
    }

    if (session.endedAt) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Session already ended",
      });
    }

    await ctx.db.patch(args.sessionId, {
      endedAt: Date.now(),
    });

    // Log activity
    await ctx.db.insert("activityLogs", {
      userId: master._id,
      action: "END_ROLE_SIMULATION",
      entityType: "roleSimulations",
      entityId: args.sessionId,
      details: `Ended simulation of ${session.simulatedRole}`,
    });

    return { success: true };
  },
});

// Get active simulation
export const getActiveSimulation = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!user || user.role !== "MASTER") {
      return null;
    }

    const sessions = await ctx.db
      .query("roleSimulations")
      .withIndex("by_master", (q) => q.eq("masterUserId", user._id))
      .filter((q) => q.eq(q.field("endedAt"), undefined))
      .collect();

    if (sessions.length === 0) {
      return null;
    }

    const session = sessions[0];
    let targetUser: Doc<"users"> | null = null;

    if (session.targetUserId) {
      targetUser = await ctx.db.get(session.targetUserId);
    }

    return {
      sessionId: session._id,
      simulatedRole: session.simulatedRole,
      targetUser: targetUser
        ? {
            id: targetUser._id,
            name: targetUser.name,
            email: targetUser.email,
            agencyId: targetUser.agencyId,
          }
        : null,
      startedAt: session.startedAt,
      reason: session.reason,
    };
  },
});

// Get simulation history
export const getSimulationHistory = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHENTICATED",
        message: "User not logged in",
      });
    }

    const master = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!master || master.role !== "MASTER") {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Only MASTER users can view simulation history",
      });
    }

    const sessions = await ctx.db
      .query("roleSimulations")
      .withIndex("by_master", (q) => q.eq("masterUserId", master._id))
      .order("desc")
      .take(args.limit || 50);

    const enrichedSessions = await Promise.all(
      sessions.map(async (session) => {
        let targetUser: Doc<"users"> | null = null;
        if (session.targetUserId) {
          targetUser = await ctx.db.get(session.targetUserId);
        }

        return {
          ...session,
          targetUser: targetUser
            ? {
                id: targetUser._id,
                name: targetUser.name,
                email: targetUser.email,
              }
            : null,
          duration: session.endedAt
            ? session.endedAt - session.startedAt
            : Date.now() - session.startedAt,
        };
      })
    );

    return enrichedSessions;
  },
});
