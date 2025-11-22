import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  setLanguageInPath,
  SUPPORTED_LANGUAGES_ARRAY,
  SUPPORTED_LANGUAGES_OBJECT,
  type SupportedLanguage,
} from "@/i18n";
import { cn } from "@/lib/utils";
import { Check, Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const currentMeta =
    SUPPORTED_LANGUAGES_OBJECT[
      i18n.language as keyof typeof SUPPORTED_LANGUAGES_OBJECT
    ];

  const handleChangeLanguage = (newLng: SupportedLanguage) => {
    // Navigate to new language URL - LanguageWrapper will update state
    const newPath = setLanguageInPath(
      newLng,
      location.pathname,
      location.search,
      location.hash,
    );
    navigate(newPath);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <Globe className="mr-2 h-4 w-4" />
          {currentMeta?.emoji} {currentMeta?.nativeName}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {SUPPORTED_LANGUAGES_ARRAY.map((lng) => {
          const meta = SUPPORTED_LANGUAGES_OBJECT[lng];
          const isActive = i18n.language === lng;
          return (
            <DropdownMenuItem
              key={lng}
              onClick={() => handleChangeLanguage(lng)}
              className="cursor-pointer"
            >
              <Check
                className={cn(
                  "mr-2 h-4 w-4",
                  isActive ? "opacity-100" : "opacity-0",
                )}
              />
              <span className="mr-2">{meta.emoji}</span>
              <span className="flex-1">{meta.nativeName}</span>
              <span className="ml-2 text-xs text-muted-foreground">
                {meta.name}
              </span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
