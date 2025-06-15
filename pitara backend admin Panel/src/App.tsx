import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import UploadSeries from "./pages/UploadSeries";
import Subscriptions from "./pages/Subscriptions";
import Users from "./pages/Users";
import Notifications from "./pages/Notifications";
import Settings from "./pages/Settings";
import TestPage from "./pages/TestPage";
import NotFound from "./pages/NotFound";
import PaymentProviders from "./pages/PaymentProviders";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/upload" element={<UploadSeries />} />
          <Route path="/subscriptions" element={<Subscriptions />} />
          <Route path="/users" element={<Users />} />
          <Route path="/admin/notifications" element={<Notifications />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/test" element={<TestPage />} />
          <Route path="/payment-providers" element={<PaymentProviders />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
