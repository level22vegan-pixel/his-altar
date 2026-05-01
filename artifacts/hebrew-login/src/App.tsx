import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import LoginPage from "@/pages/LoginPage";
import HomePage from "@/pages/HomePage";
import AdminPage from "@/pages/AdminPage";
import HallmarkPage from "@/pages/HallmarkPage";
import AltarReportPage from "@/pages/AltarReportPage";
import CheckInPage from "@/pages/CheckInPage";
import RosterManagerPage from "@/pages/RosterManagerPage";
import ServiceReportPage from "@/pages/ServiceReportPage";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={LoginPage} />
      <Route path="/home" component={HomePage} />
      <Route path="/admin" component={AdminPage} />
      <Route path="/campus/hallmark" component={HallmarkPage} />
      <Route path="/admin/altar-report" component={AltarReportPage} />
      <Route path="/admin/roster" component={RosterManagerPage} />
      <Route path="/checkin" component={CheckInPage} />
      <Route path="/admin/service-report" component={ServiceReportPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
