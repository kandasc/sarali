import { useCallback, useEffect, useMemo } from "react";
import { useClerk, useAuth as useClerkAuth, useUser as useClerkUser } from "@clerk/clerk-react";

type AuthProfile = {
  sub?: string;
  name?: string;
  email?: string;
  picture?: string;
};

type AuthUser = {
  profile: AuthProfile;
  id_token?: string;
};

type AuthError = {
  message: string;
};

type UseAuthHook = {
  fetchAccessToken: (args: { forceRefreshToken: boolean }) => Promise<string | null>;
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error?: AuthError | null;
  signinRedirect: () => Promise<void>;
  signoutRedirect: () => Promise<void>;
  removeUser: () => Promise<void>;
};

export function useAuth(): UseAuthHook {
  const clerk = useClerk();
  const { getToken, isLoaded: isClerkLoaded, isSignedIn } = useClerkAuth();
  const {
    user: clerkUser,
    isLoaded,
  } = useClerkUser();

  const signinRedirect = useCallback(async () => {
    await clerk.openSignIn();
  }, [clerk]);

  const signoutRedirect = useCallback(async () => {
    await clerk.signOut({ redirectUrl: "/" });
  }, [clerk]);

  const removeUser = useCallback(async () => {
    await signoutRedirect();
  }, [signoutRedirect]);

  const fetchAccessToken = useCallback(
    // Kept for backward compatibility with any remaining ConvexProviderWithAuth wiring.
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      if (!isClerkLoaded || !isSignedIn) return null;
      return (
        (await getToken({ template: "convex", skipCache: forceRefreshToken })) ?? null
      );
    },
    [getToken, isClerkLoaded, isSignedIn],
  );

  return useMemo(() => {
    const mappedUser: AuthUser | null = clerkUser
      ? {
          profile: {
            sub: clerkUser.id,
            name: clerkUser.fullName ?? undefined,
            email:
              clerkUser.primaryEmailAddress?.emailAddress ??
              clerkUser.emailAddresses?.[0]?.emailAddress ??
              undefined,
            picture: clerkUser.imageUrl ?? undefined,
          },
          id_token: undefined,
        }
      : null;

    return {
      user: mappedUser,
      isAuthenticated: isClerkLoaded && !!isSignedIn,
      isLoading: !isClerkLoaded,
      error: null,
      signinRedirect,
      signoutRedirect,
      removeUser,
      fetchAccessToken,
    };
  }, [
    clerkUser,
    fetchAccessToken,
    isSignedIn,
    isClerkLoaded,
    removeUser,
    signoutRedirect,
    signinRedirect,
  ]);
}

type UseUserProps = {
  /**
   * Whether to automatically redirect to the login if the user is not authenticated
   */
  shouldRedirect?: boolean;
};

export function useUser({ shouldRedirect }: UseUserProps = {}) {
  const { user, isLoading, error, isAuthenticated, signinRedirect } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated && shouldRedirect) {
      signinRedirect();
    }
  }, [isLoading, isAuthenticated, shouldRedirect, signinRedirect]);

  return useMemo(() => {
    const id = user?.profile.sub;
    const name = user?.profile.name;
    const email = user?.profile.email;
    const avatar = user?.profile.picture;
    return {
      ...(user ?? {}),
      id,
      name,
      email,
      avatar,
      isAuthenticated,
      isLoading,
      error,
    };
  }, [user, isAuthenticated, isLoading, error]);
}
