import {
  changeLanguage,
  isSupportedLanguage,
  SAVED_OR_DEFAULT_LANGUAGE,
  setLanguageInPath,
  type SupportedLanguage,
} from "@/i18n";
import { useEffect, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useLocation, useParams } from "react-router-dom";

export default function LanguageWrapper({ children }: { children: ReactNode }) {
  const { lng } = useParams<{ lng: string }>();
  const { i18n } = useTranslation();
  const location = useLocation();

  // This is the ONLY place changeLanguage is called
  // All language changes flow through URL → LanguageWrapper → changeLanguage
  // Must be called BEFORE any conditional returns (Rules of Hooks)
  useEffect(() => {
    if (lng && isSupportedLanguage(lng) && i18n.language !== lng) {
      void changeLanguage(lng);
    }
  }, [lng, i18n]);

  // Redirect uppercase/mixed-case language codes to lowercase
  if (lng && lng !== lng.toLowerCase()) {
    const redirectPath = setLanguageInPath(
      lng.toLowerCase() as SupportedLanguage,
      location.pathname,
      location.search,
      location.hash,
    );
    return <Navigate to={redirectPath} replace />;
  }

  // If language is invalid, redirect with saved/default language
  if (!lng || !isSupportedLanguage(lng)) {
    const redirectPath = setLanguageInPath(
      SAVED_OR_DEFAULT_LANGUAGE,
      location.pathname,
      location.search,
      location.hash,
    );
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
}
