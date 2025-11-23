import { ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const updateCurrentUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHENTICATED",
        message: "User not logged in",
      });
    }

    // Check if we've already stored this identity before.
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();
    
    if (user !== null) {
      // Upgrade existing user to SUPER_ADMIN if they have the designated email
      if (identity.email === "kandasc@gmail.com" && user.role !== "SUPER_ADMIN") {
        await ctx.db.patch(user._id, {
          role: "SUPER_ADMIN",
        });
      }
      return user._id;
    }
    
    // Check if this is the designated super admin email
    const isSuperAdmin = identity.email === "kandasc@gmail.com";
    
    // Check if this is the first user (will be MASTER)
    const existingUsers = await ctx.db.query("users").collect();
    const isMaster = existingUsers.length === 0 && !isSuperAdmin;
    
    // If it's a new identity, create a new User.
    return await ctx.db.insert("users", {
      name: identity.name,
      email: identity.email,
      tokenIdentifier: identity.tokenIdentifier,
      role: isSuperAdmin ? "SUPER_ADMIN" : isMaster ? "MASTER" : "CAISSIER",
      status: "ACTIVE",
      creditBalance: 0,
      currency: "XOF",
    });
  },
});

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHENTICATED",
        message: "Called getCurrentUser without authentication present",
      });
    }
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();
    return user;
  },
});
