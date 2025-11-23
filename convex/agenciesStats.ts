import { ConvexError } from "convex/values";
import { query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import { v } from "convex/values";

// Helper function to check permissions
async function checkPermission(
  ctx: QueryCtx,
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

// Get global agency statistics
export const getGlobalStats = query({
  args: {},
  handler: async (ctx) => {
    await checkPermission(ctx, ["SUPER_ADMIN", "MASTER", "MANAGER"]);

    const agencies = await ctx.db.query("agencies").collect();
    const allUsers = await ctx.db.query("users").collect();

    const activeAgencies = agencies.filter((a) => a.status === "ACTIVE");
    const totalAgencies = agencies.length;

    // Count users by role
    const totalUsers = allUsers.length;
    const activeUsers = allUsers.filter((u) => u.status === "ACTIVE").length;
    const managers = allUsers.filter((u) => u.role === "MANAGER").length;
    const chefs = allUsers.filter((u) => u.role === "CHEF_AGENCE").length;
    const caissiers = allUsers.filter((u) => u.role === "CAISSIER").length;

    // Calculate total credits by currency
    const creditsByXOF = allUsers
      .filter((u) => u.currency === "XOF")
      .reduce((sum, u) => sum + u.creditBalance, 0);

    const creditsByGNF = allUsers
      .filter((u) => u.currency === "GNF")
      .reduce((sum, u) => sum + u.creditBalance, 0);

    const agencyCreditsByXOF = agencies
      .filter((a) => a.currency === "XOF")
      .reduce((sum, a) => sum + a.creditBalance, 0);

    const agencyCreditsByGNF = agencies
      .filter((a) => a.currency === "GNF")
      .reduce((sum, a) => sum + a.creditBalance, 0);

    // Agency with most users
    const agenciesWithUserCount = await Promise.all(
      agencies.map(async (agency) => {
        const usersInAgency = await ctx.db
          .query("users")
          .withIndex("by_agency", (q) => q.eq("agencyId", agency._id))
          .collect();
        return {
          agency,
          userCount: usersInAgency.length,
        };
      })
    );

    const sortedAgencies = agenciesWithUserCount.sort(
      (a, b) => b.userCount - a.userCount
    );

    const topAgency = sortedAgencies[0] || null;

    return {
      totalAgencies,
      activeAgencies: activeAgencies.length,
      totalUsers,
      activeUsers,
      managers,
      chefs,
      caissiers,
      credits: {
        userCreditsXOF: creditsByXOF,
        userCreditsGNF: creditsByGNF,
        agencyCreditsXOF: agencyCreditsByXOF,
        agencyCreditsGNF: agencyCreditsByGNF,
        totalXOF: creditsByXOF + agencyCreditsByXOF,
        totalGNF: creditsByGNF + agencyCreditsByGNF,
      },
      topAgency: topAgency
        ? {
            name: topAgency.agency.name,
            code: topAgency.agency.code,
            userCount: topAgency.userCount,
          }
        : null,
    };
  },
});

// Get agencies by country
export const getAgenciesByCountry = query({
  args: {},
  handler: async (ctx) => {
    await checkPermission(ctx, ["SUPER_ADMIN", "MASTER", "MANAGER"]);

    const agencies = await ctx.db.query("agencies").collect();

    const countryCounts: Record<string, number> = {};

    agencies.forEach((agency) => {
      if (countryCounts[agency.country]) {
        countryCounts[agency.country]++;
      } else {
        countryCounts[agency.country] = 1;
      }
    });

    return Object.entries(countryCounts)
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count);
  },
});
