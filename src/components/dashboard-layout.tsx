import { useAuth } from "@/hooks/use-auth.ts";
import { LogOut, User } from "lucide-react";
import { Button } from "./ui/button.tsx";
import { RoleSimulationBanner } from "./role-simulation-banner.tsx";
import LanguageSwitcher from "./ui/language-switcher.tsx";
import { useTranslation } from "react-i18next";
import type { ReactNode } from "react";

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
}

export default function DashboardLayout({
  children,
  title,
}: DashboardLayoutProps) {
  const { user, signoutRedirect } = useAuth();
  const { t } = useTranslation("common");

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <nav className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <img src="/sarali-logo.png" alt="Sarali" className="h-8 w-8 object-contain" />
              <span className="text-xl font-bold">{t("app.name")}</span>
            </div>
            <div className="h-6 w-px bg-border" />
            <h1 className="text-lg font-semibold">{title}</h1>
          </div>

          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{user?.profile.name}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signoutRedirect()}
            >
              <LogOut className="h-4 w-4 mr-2" />
              {t("buttons.signOut")}
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <RoleSimulationBanner />
        {children}
      </main>
    </div>
  );
}
