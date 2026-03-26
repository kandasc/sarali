import { Link, useLocation } from "react-router-dom";
import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import LanguageSwitcher from "@/components/ui/language-switcher.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import { LayoutDashboard, LogIn } from "lucide-react";

type PaymentTopNavProps = {
  /** Agency logo URL; default Sayele squircle */
  brandLogoUrl?: string | null;
  className?: string;
};

export function PaymentTopNav({
  brandLogoUrl,
  className = "",
}: PaymentTopNavProps) {
  const location = useLocation();
  const currentUser = useQuery(api.users.getCurrentUserOrNull);
  const lang = location.pathname.split("/")[1] || "fr";
  const homePath = `/${lang}`;

  return (
    <nav
      className={`border-b bg-background/80 backdrop-blur-sm print:hidden ${className}`}
    >
      <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
        <Link
          to={homePath}
          className="flex items-center gap-2 sm:gap-3 min-w-0 rounded-md outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring shrink-0 hover:opacity-90 transition-opacity"
          aria-label="Sarali — Accueil paiement"
        >
          <img
            src={brandLogoUrl ?? "/sayele-logo.png"}
            alt=""
            className="h-9 w-9 sm:h-10 sm:w-10 object-contain rounded-lg shrink-0"
            decoding="async"
          />
          <span className="text-lg sm:text-xl font-semibold tracking-tight text-foreground truncate">
            Sarali
          </span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageSwitcher />
          <Unauthenticated>
            <SignInButton variant="outline" size="sm">
              <LogIn className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Connexion agent</span>
            </SignInButton>
          </Unauthenticated>
          <Authenticated>
            {currentUser &&
              (() => {
                let dashboardPath = `/${lang}/cashier`;
                switch (currentUser.role) {
                  case "SUPER_ADMIN":
                    dashboardPath = `/${lang}/superadmin`;
                    break;
                  case "MASTER":
                    dashboardPath = `/${lang}/master`;
                    break;
                  case "MANAGER":
                    dashboardPath = `/${lang}/manager`;
                    break;
                  case "CHEF_AGENCE":
                    dashboardPath = `/${lang}/agency`;
                    break;
                  case "CAISSIER":
                    dashboardPath = `/${lang}/cashier`;
                    break;
                  case "BILLER":
                    dashboardPath = `/${lang}/biller`;
                    break;
                }
                return (
                  <Button variant="outline" size="sm" asChild>
                    <Link to={dashboardPath}>
                      <LayoutDashboard className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Dashboard</span>
                    </Link>
                  </Button>
                );
              })()}
          </Authenticated>
        </div>
      </div>
    </nav>
  );
}
