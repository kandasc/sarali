import { BrowserRouter, Route, Routes } from "react-router-dom";
import { DefaultProviders } from "./components/providers/default.tsx";
import AuthCallback from "./pages/auth/Callback.tsx";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
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
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/master" element={<MasterDashboard />} />
          <Route path="/manager" element={<ManagerDashboard />} />
          <Route path="/agency" element={<AgencyDashboard />} />
          <Route path="/cashier" element={<CashierDashboard />} />
          <Route path="/pay" element={<PublicPaymentPage />} />
          <Route path="/pay/success" element={<PaymentSuccessPage />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </DefaultProviders>
  );
}
