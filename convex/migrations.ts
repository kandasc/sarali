import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Migration: Upgrade kandasc@gmail.com to SUPER_ADMIN
export const upgradeSuperAdmin = mutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();

    if (!user) {
      return { success: false, message: "User not found" };
    }

    if (user.role === "SUPER_ADMIN") {
      return { success: true, message: "User is already SUPER_ADMIN" };
    }

    await ctx.db.patch(user._id, {
      role: "SUPER_ADMIN",
    });

    return { success: true, message: `User upgraded to SUPER_ADMIN` };
  },
});
