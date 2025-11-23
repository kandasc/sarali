import { Suspense } from "react";
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
} from "react-router-dom";
import { DefaultProviders } from "./components/providers/default.tsx";
import LanguageWrapper from "./components/providers/language-wrapper.tsx";
import { SAVED_OR_DEFAULT_LANGUAGE, setLanguageInPath } from "./i18n";
import "./i18n";
import AuthCallback from "./pages/auth/Callback.tsx";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import SuperAdminDashboard from "./pages/superadmin/page.tsx";
import MasterDashboard from "./pages/master/page.tsx";
import ManagerDashboard from "./pages/manager/page.tsx";
import AgencyDashboard from "./pages/agency/page.tsx";
import CashierDashboard from "./pages/cashier/page.tsx";
import PublicPaymentPage from "./pages/pay/page.tsx";
import PaymentSuccessPage from "./pages/pay/success.tsx";

export default function App() {
  return (
    <DefaultProviders>
      <BrowserRouter>
        <Suspense fallback={<div></div>}>
          <Routes>
            {/* Root: redirect to saved/default language */}
            <Route
              path="/"
              element={
                <Navigate
                  to={setLanguageInPath(SAVED_OR_DEFAULT_LANGUAGE, "/")}
                  replace
                />
              }
            />

            {/* Non-localized routes (auth, webhooks, etc.) */}
            <Route path="/auth/callback" element={<AuthCallback />} />

            {/* All localized routes under /:lng */}
            <Route
              path="/:lng"
              element={
                <LanguageWrapper>
                  <Outlet />
                </LanguageWrapper>
              }
            >
              <Route index element={<PublicPaymentPage />} />
              <Route path="dashboard" element={<Index />} />
              <Route path="superadmin" element={<SuperAdminDashboard />} />
              <Route path="master" element={<MasterDashboard />} />
              <Route path="manager" element={<ManagerDashboard />} />
              <Route path="agency" element={<AgencyDashboard />} />
              <Route path="cashier" element={<CashierDashboard />} />
              <Route path="success" element={<PaymentSuccessPage />} />
              <Route path=":agencyCode" element={<PublicPaymentPage />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </DefaultProviders>
  );
}
