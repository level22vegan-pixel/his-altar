import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import LoginPage from "@/pages/LoginPage";
import HomePage from "@/pages/HomePage";
import AdminPage from "@/pages/AdminPage";
import HallmarkPage from "@/pages/HallmarkPage";
import ArrowheadPage from "@/pages/ArrowheadPage";
import RiversidePage from "@/pages/RiversidePage";
import PomonaPage from "@/pages/PomonaPage";
import LAPage from "@/pages/LAPage";
import ArizonaPage from "@/pages/ArizonaPage";
import AltarReportPage from "@/pages/AltarReportPage";
import DbancPage from "@/pages/DbancPage";
import DbancContactFormPage from "@/pages/DbancContactFormPage";
import DbancFieldsPage from "@/pages/DbancFieldsPage";
import PXPPage from "@/pages/PXPPage";
import PXPCallPage from "@/pages/PXPCallPage";
import PXPLogsPage from "@/pages/PXPLogsPage";
import PXPScriptPage from "@/pages/PXPScriptPage";
import PXPCallersPage from "@/pages/PXPCallersPage";
import CallerLoginPage from "@/pages/CallerLoginPage";
import CallerPasswordsPage from "@/pages/CallerPasswordsPage";
import ActivityLogPage from "@/pages/ActivityLogPage";
import CheckInPage from "@/pages/CheckInPage";
import RosterManagerPage from "@/pages/RosterManagerPage";
import ServiceReportPage from "@/pages/ServiceReportPage";
import NotFound from "@/pages/not-found";
import { hasValidSession, clearAllSessions } from "@/lib/session";

const queryClient = new QueryClient();

const LOGIN_PATH = "/";
const UNGUARDED = [LOGIN_PATH, "/caller-login"];

function SessionGuard() {
  const [location, navigate] = useLocation();

  useEffect(() => {
    if (UNGUARDED.includes(location)) return;

    const check = () => {
      if (!hasValidSession()) {
        clearAllSessions();
        navigate(LOGIN_PATH);
      }
    };

    check();
    const interval = setInterval(check, 60 * 1000);
    return () => clearInterval(interval);
  }, [location, navigate]);

  return null;
}

function Router() {
  return (
    <>
      <SessionGuard />
      <Switch>
        <Route path="/" component={LoginPage} />
        <Route path="/home" component={HomePage} />
        <Route path="/admin" component={AdminPage} />
        <Route path="/campus/hallmark" component={HallmarkPage} />
        <Route path="/campus/arrowhead" component={ArrowheadPage} />
        <Route path="/campus/riverside" component={RiversidePage} />
        <Route path="/campus/pomona" component={PomonaPage} />
        <Route path="/campus/la" component={LAPage} />
        <Route path="/campus/arizona" component={ArizonaPage} />
        <Route path="/admin/altar-report" component={AltarReportPage} />
        <Route path="/admin/roster" component={RosterManagerPage} />
        <Route path="/checkin" component={CheckInPage} />
        <Route path="/admin/service-report" component={ServiceReportPage} />
        <Route path="/admin/dbanc" component={DbancPage} />
        <Route path="/admin/dbanc/new" component={DbancContactFormPage} />
        <Route path="/admin/dbanc/contacts/:id" component={DbancContactFormPage} />
        <Route path="/admin/dbanc/fields" component={DbancFieldsPage} />
        <Route path="/admin/pxp" component={PXPPage} />
        <Route path="/admin/pxp/call" component={PXPCallPage} />
        <Route path="/admin/pxp/logs" component={PXPLogsPage} />
        <Route path="/admin/pxp/script" component={PXPScriptPage} />
        <Route path="/admin/pxp/callers" component={PXPCallersPage} />
        <Route path="/admin/caller-passwords" component={CallerPasswordsPage} />
        <Route path="/caller-login" component={CallerLoginPage} />
        <Route path="/admin/activity-log/dbanc">{() => <ActivityLogPage tool="dbanc" />}</Route>
        <Route path="/admin/activity-log/pxp">{() => <ActivityLogPage tool="pxp" />}</Route>
        <Route component={NotFound} />
      </Switch>
    </>
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
