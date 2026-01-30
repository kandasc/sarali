import LanguageSwitcher from "@/components/ui/language-switcher.tsx";
import { useTranslation } from "react-i18next";

export default function Footer() {
  const { t } = useTranslation("common");
  
  return (
    <footer className="border-t bg-background/80 backdrop-blur-sm py-6 mt-12">
      <div className="container mx-auto px-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{t("app.name")}</span>
            {", by "}
            <a
              href="https://sayele.co"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground hover:underline"
            >
              SAYELE
            </a>
          </div>
          <LanguageSwitcher />
        </div>
      </div>
    </footer>
  );
}
