// Must match the JWT `iss` claim from Clerk (Clerk Dashboard → JWT templates → "convex").
// Dev:  https://<instance>.clerk.accounts.dev
// Prod: often https://clerk.<your-domain>.com when using a Clerk Frontend API custom domain
//
// Set on Convex (not only in Vite): `npx convex env set CLERK_JWT_ISSUER_DOMAIN "<issuer>"` / same with `--prod`
const domain =
  process.env.CLERK_JWT_ISSUER_DOMAIN?.trim() ||
  "https://unified-jaguar-47.clerk.accounts.dev";

export default {
  providers: [
    {
      domain,
      applicationID: "convex",
    },
  ],
};
