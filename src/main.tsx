import { createRoot } from "react-dom/client";
import { ClerkProvider, useAuth as useClerkAuth } from "@clerk/clerk-react";
import { ConvexReactClient, ConvexProvider } from "convex/react";
import { useEffect } from "react";
import App from "./App.tsx";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

function ConvexWithClerkAuth({ children }: { children: React.ReactNode }) {
  const { getToken, isSignedIn, isLoaded } = useClerkAuth();
  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn) {
      convex.setAuth(async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
        return await getToken({ template: "convex", skipCache: forceRefreshToken }) ?? null;
      });
    } else {
      convex.clearAuth();
    }
  }, [isSignedIn, isLoaded, getToken]);
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}

createRoot(document.getElementById("root")!).render(
  <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}>
    <ConvexWithClerkAuth><App /></ConvexWithClerkAuth>
  </ClerkProvider>
);
