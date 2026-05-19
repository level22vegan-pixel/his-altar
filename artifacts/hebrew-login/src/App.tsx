import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import LandingPage from "@/pages/LandingPage";
import StaffLoginPage from "@/pages/StaffLoginPage";
import AdminLoginPage from "@/pages/AdminLoginPage";
import AdminProfilePage from "@/pages/AdminProfilePage";
import PinEntryPage from "@/pages/PinEntryPage";
import TeamPage from "@/pages/TeamPage";
import HomePage from "@/pages/HomePage";
import AdminPage from "@/pages/AdminPage";
import HallmarkPage from "@/pages/HallmarkPage";
import AltarReportPage from "@/pages/AltarReportPage";
import DbancPage from "@/pages/DbancPage";
import DbancContactFormPage from "@/pages/DbancContactFormPage";
import DbancFieldsPage from "@/pages/DbancFieldsPage";
import PXPPage from "@/pages/PXPPage";
import PXPCallPage from "@/pages/PXPCallPage";
import PXPLogsPage from "@/pages/PXPLogsPage";
import PXPScriptPage from "@/pages/PXPScriptPage";
import PXPCallersPage from "@/pages/PXPCallersPage";
import PXPContactProfilePage from "@/pages/PXPContactProfilePage";
import CallerLoginPage from "@/pages/CallerLoginPage";
import CallerPasswordsPage from "@/pages/CallerPasswordsPage";
import ActivityLogPage from "@/pages/ActivityLogPage";
import CheckInPage from "@/pages/CheckInPage";
import RosterManagerPage from "@/pages/RosterManagerPage";
import AdminServiceTimesPage from "@/pages/AdminServiceTimesPage";
import AccessCodesPage from "@/pages/AccessCodesPage";
import ServiceReportPage from "@/pages/ServiceReportPage";
import NotFound from "@/pages/not-found";
import OrgLoginPage from "@/pages/OrgLoginPage";
import OrgResetPasswordPage from "@/pages/OrgResetPasswordPage";
import OrgSignupPage from "@/pages/OrgSignupPage";
import OrgSetupPage from "@/pages/OrgSetupPage";
import OrgBillingPage from "@/pages/OrgBillingPage";
import AboutPage from "@/pages/AboutPage";
import TermsPage from "@/pages/TermsPage";
import PrivacyPage from "@/pages/PrivacyPage";
import UnauthorizedPage from "@/pages/UnauthorizedPage";
import SuperAdminLoginPage from "@/pages/SuperAdminLoginPage";
import SuperAdminDashboard from "@/pages/SuperAdminDashboard";
import { hasValidSession, clearAllSessions, getValidAdminSession, getValidCampusSession, getValidCallerSession, getValidOrgSession } from "@/lib/session";

const queryClient = new QueryClient();

const LOGIN_PATH = "/";
const UNGUARDED = [LOGIN_PATH, "/enter", "/team", "/staff", "/caller-login", "/org/login", "/org/signup", "/org/reset-password", "/admin/login", "/about", "/terms", "/privacy", "/unauthorized", "/superadmin/login", "/superadmin"];

function SessionGuard() {
  const [location, navigate] = useLocation();

  useEffect(() => {
    if (UNGUARDED.includes(location)) return;

    const check = () => {
      const isAdmin = getValidAdminSession();
      const campus  = getValidCampusSession();
      const caller  = getValidCallerSession();
      const org     = getValidOrgSession();

      // Lead role has full admin-level access (downward permission model)
      const isLeadOrAdmin = isAdmin || campus?.role === "lead";

      // PXP routes — lead/admin or caller
      if (location.startsWith("/admin/pxp")) {
        if (!isLeadOrAdmin && !caller) { navigate("/caller-login"); return; }
        return;
      }

      // Dbanc contact form — any campus staff or admin (for adding altar contacts)
      if (location === "/admin/dbanc/new" || location.startsWith("/admin/dbanc/contacts/")) {
        if (!isAdmin && !campus) { navigate("/enter"); return; }
        return;
      }

      // All other /admin/* routes — lead role or admin
      if (location.startsWith("/admin")) {
        if (!isLeadOrAdmin) { navigate("/admin/login"); return; }
        return;
      }

      // Campus pages & check-in — campus session or admin
      if (location.startsWith("/campus") || location === "/checkin") {
        if (!isAdmin && !campus) { navigate("/enter"); return; }
        return;
      }

      // Org setup / billing — org session or admin
      if (location.startsWith("/org/setup") || location.startsWith("/org/billing")) {
        if (!isAdmin && !org) { navigate("/org/login"); return; }
        return;
      }

      // Legacy dashboard redirect
      if (location.startsWith("/org/dashboard")) {
        navigate("/team", { replace: true }); return;
      }

      // Everything else — any valid session
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
        <Route path="/" component={LandingPage} />
        <Route path="/enter" component={PinEntryPage} />
        <Route path="/team" component={TeamPage} />
        <Route path="/org/login" component={OrgLoginPage} />
        <Route path="/staff" component={StaffLoginPage} />
        <Route path="/admin/login" component={AdminLoginPage} />
        <Route path="/about" component={AboutPage} />
        <Route path="/terms" component={TermsPage} />
        <Route path="/privacy" component={PrivacyPage} />
        <Route path="/unauthorized" component={UnauthorizedPage} />
        <Route path="/admin/profile" component={AdminProfilePage} />
        <Route path="/home" component={HomePage} />
        <Route path="/admin" component={AdminPage} />
        <Route path="/campus/hallmark" component={HallmarkPage} />
        <Route path="/admin/altar-report" component={AltarReportPage} />
        <Route path="/admin/roster" component={RosterManagerPage} />
        <Route path="/admin/access-codes" component={AccessCodesPage} />
        <Route path="/admin/service-times" component={AdminServiceTimesPage} />
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
        <Route path="/org/setup" component={OrgSetupPage} />
        <Route path="/admin/pxp/contacts/:id" component={PXPContactProfilePage} />
        <Route path="/admin/caller-passwords" component={CallerPasswordsPage} />
        <Route path="/caller-login" component={CallerLoginPage} />
        <Route path="/org/login" component={OrgLoginPage} />

        <Route path="/org/signup" component={OrgSignupPage} />
        <Route path="/org/reset-password" component={OrgResetPasswordPage} />
        <Route path="/org/billing" component={OrgBillingPage} />
        <Route path="/admin/activity-log/dbanc">{() => <ActivityLogPage tool="dbanc" />}</Route>
        <Route path="/admin/activity-log/pxp">{() => <ActivityLogPage tool="pxp" />}</Route>
        <Route path="/superadmin/login" component={SuperAdminLoginPage} />
        <Route path="/superadmin" component={SuperAdminDashboard} />
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
