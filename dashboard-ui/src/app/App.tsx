import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Sidebar, SidebarPanel } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { TraineeSubNav } from './components/layout/TraineeSubNav';
import { PageScaffold } from './components/layout/PageScaffold';
import { Sheet, SheetContent } from './components/ui/sheet';
import { AreaGuard } from './components/AreaGuard';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { OperationsPage } from './pages/OperationsPage';
import { OperationsLayout } from './pages/operations/OperationsLayout';
import { OperationsOverviewPage } from './pages/operations/OperationsOverviewPage';
import { OperationsInsightsPage } from './pages/operations/OperationsInsightsPage';
import { OperationsImportPage } from './pages/operations/OperationsImportPage';
import { OperationsIntegrationEventsPage } from './pages/operations/OperationsIntegrationEventsPage';
import { OperationsLmsAdminPage } from './pages/operations/OperationsLmsAdminPage';
import { TraineeProfilePage } from './pages/operations/TraineeProfilePage';
import { TrainingLayout } from './pages/training/TrainingLayout';
import { TrainingOverviewPage } from './pages/training/TrainingOverviewPage';
import { TrainingSessionsPage } from './pages/training/TrainingSessionsPage';
import { TrainingPresenterPage } from './pages/training/TrainingPresenterPage';
import { TrainingClassroomPage } from './pages/training/TrainingClassroomPage';
import { TrainingAssignmentsPage } from './pages/training/TrainingAssignmentsPage';
import { TrainingMaterialsAttendancePage } from './pages/training/TrainingMaterialsAttendancePage';
import { TrainingCourseLibraryPage } from './pages/training/TrainingCourseLibraryPage';
import { TrainingCredentialsPage } from './pages/training/TrainingCredentialsPage';
import { TrainingLmsAnalyticsPage } from './pages/training/TrainingLmsAnalyticsPage';
import { TrainingLmsCatalogPage } from './pages/training/TrainingLmsCatalogPage';
import { TrainingAssessmentsPage } from './pages/training/TrainingAssessmentsPage';
import { FinanceLayout } from './pages/finance/FinanceLayout';
import { FinanceOverviewPage } from './pages/finance/FinanceOverviewPage';
import { FinanceReceivablesPage } from './pages/finance/FinanceReceivablesPage';
import { FinanceCashBookPage } from './pages/finance/FinanceCashBookPage';
import { FinanceExpensesPage } from './pages/finance/FinanceExpensesPage';
import { FinancePaymentsPage } from './pages/finance/FinancePaymentsPage';
import { FinanceReceiptsPage } from './pages/finance/FinanceReceiptsPage';
import { FinanceInvoicesPage } from './pages/finance/FinanceInvoicesPage';
import { FinanceLedgerPage } from './pages/finance/FinanceLedgerPage';
import { CampaignsPage } from './pages/CampaignsPage';
import { AdminPage } from './pages/AdminPage';
import { ToolsPage } from './pages/ToolsPage';
import { ChangePasswordPage } from './pages/ChangePasswordPage';
import { TraineePortalPage } from './pages/TraineePortalPage';
import { AUTH_TOKEN } from '../lib/api';
import { PublicQueryRouter, hasPublicQuery } from './pages/public/PublicQueryRouter';
import { defaultPathForRole } from '../lib/roleAccess';
import { getRouteMeta } from '../lib/routeMeta';

function RootEntry() {
  if (hasPublicQuery()) return <PublicQueryRouter />;
  const token = localStorage.getItem(AUTH_TOKEN);
  if (!token) return <Navigate to="/login" replace />;
  const role = String(localStorage.getItem('sbs_role') || 'user').toLowerCase();
  return <Navigate to={defaultPathForRole(role)} replace />;
}

function RoleHomeRedirect() {
  const role = String(localStorage.getItem('sbs_role') || 'user').toLowerCase();
  return <Navigate to={defaultPathForRole(role)} replace />;
}

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem(AUTH_TOKEN);
  const role = localStorage.getItem('sbs_role') || 'user';
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const onChange = () => {
      if (mq.matches) setMobileNavOpen(false);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const isTrainee = String(role).toLowerCase() === 'trainee';
  const meta = getRouteMeta(location.pathname);

  return (
    <div className="flex h-screen min-h-0 bg-[var(--brand-bg)]">
      {!isTrainee ? (
        <>
          <Sidebar currentRole={role} />
          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <SheetContent
              side="left"
              className="w-64 max-w-[min(100vw,16rem)] border-[var(--brand-border)] bg-[var(--brand-surface)] p-0 !shadow-[var(--brand-shadow)] sm:max-w-[min(100vw,16rem)] [&>button]:text-[var(--brand-text)] [&>button]:hover:bg-[var(--brand-surface-2)]"
            >
              <SidebarPanel currentRole={role} onNavigate={() => setMobileNavOpen(false)} />
            </SheetContent>
          </Sheet>
        </>
      ) : null}
      <div className={`flex min-w-0 flex-1 flex-col overflow-hidden ${isTrainee ? '' : 'md:ml-64'}`}>
        <TopBar
          title={meta.title}
          subtitle={meta.subtitle}
          showMenuButton={!isTrainee}
          onMenuClick={() => setMobileNavOpen(true)}
        />
        {isTrainee ? <TraineeSubNav /> : null}
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto p-4 md:p-6">
          <PageScaffold>
            <AreaGuard role={role}>{children}</AreaGuard>
          </PageScaffold>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter basename="/spa">
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/account/password"
          element={
            <ProtectedLayout>
              <ChangePasswordPage />
            </ProtectedLayout>
          }
        />
        <Route path="/" element={<RootEntry />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedLayout>
              <DashboardPage />
            </ProtectedLayout>
          }
        />
        <Route
          path="/trainee/portal"
          element={
            <ProtectedLayout>
              <TraineePortalPage />
            </ProtectedLayout>
          }
        />
        <Route
          path="/operations"
          element={
            <ProtectedLayout>
              <OperationsLayout />
            </ProtectedLayout>
          }
        >
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<OperationsOverviewPage />} />
          <Route path="insights" element={<OperationsInsightsPage />} />
          <Route path="import" element={<OperationsImportPage />} />
          <Route path="integration-events" element={<OperationsIntegrationEventsPage />} />
          <Route path="lms-admin" element={<OperationsLmsAdminPage />} />
          <Route path="trainees/:traineeId" element={<TraineeProfilePage />} />
          <Route path=":tab" element={<OperationsPage />} />
        </Route>
        <Route
          path="/training"
          element={
            <ProtectedLayout>
              <TrainingLayout />
            </ProtectedLayout>
          }
        >
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<TrainingOverviewPage />} />
          <Route path="sessions" element={<TrainingSessionsPage />} />
          <Route path="presenter" element={<TrainingPresenterPage />} />
          <Route path="classroom" element={<TrainingClassroomPage />} />
          <Route path="assignments" element={<TrainingAssignmentsPage />} />
          <Route path="lms-analytics" element={<TrainingLmsAnalyticsPage />} />
          <Route path="lms-catalog" element={<TrainingLmsCatalogPage />} />
          <Route path="assessments" element={<TrainingAssessmentsPage />} />
          <Route path="materials" element={<TrainingMaterialsAttendancePage />} />
          <Route path="library" element={<TrainingCourseLibraryPage />} />
          <Route path="credentials" element={<TrainingCredentialsPage />} />
        </Route>
        <Route
          path="/finance"
          element={
            <ProtectedLayout>
              <FinanceLayout />
            </ProtectedLayout>
          }
        >
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<FinanceOverviewPage />} />
          <Route path="receivables" element={<FinanceReceivablesPage />} />
          <Route path="cashbook" element={<FinanceCashBookPage />} />
          <Route path="expenses" element={<FinanceExpensesPage />} />
          <Route path="payments" element={<FinancePaymentsPage />} />
          <Route path="receipts" element={<FinanceReceiptsPage />} />
          <Route path="invoices" element={<FinanceInvoicesPage />} />
          <Route path="ledger" element={<FinanceLedgerPage />} />
        </Route>
        <Route
          path="/automation"
          element={
            <ProtectedLayout>
              <CampaignsPage />
            </ProtectedLayout>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedLayout>
              <AdminPage />
            </ProtectedLayout>
          }
        />
        <Route
          path="/tools"
          element={
            <ProtectedLayout>
              <ToolsPage />
            </ProtectedLayout>
          }
        />
        <Route path="*" element={<RoleHomeRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}
