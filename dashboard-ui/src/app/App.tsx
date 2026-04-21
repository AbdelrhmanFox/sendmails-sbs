import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { AreaGuard } from './components/AreaGuard';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { OperationsPage } from './pages/OperationsPage';
import { OperationsLayout } from './pages/operations/OperationsLayout';
import { OperationsOverviewPage } from './pages/operations/OperationsOverviewPage';
import { OperationsInsightsPage } from './pages/operations/OperationsInsightsPage';
import { OperationsImportPage } from './pages/operations/OperationsImportPage';
import { TrainingLayout } from './pages/training/TrainingLayout';
import { TrainingOverviewPage } from './pages/training/TrainingOverviewPage';
import { TrainingSessionsPage } from './pages/training/TrainingSessionsPage';
import { TrainingPresenterPage } from './pages/training/TrainingPresenterPage';
import { TrainingClassroomPage } from './pages/training/TrainingClassroomPage';
import { TrainingMaterialsAttendancePage } from './pages/training/TrainingMaterialsAttendancePage';
import { TrainingCourseLibraryPage } from './pages/training/TrainingCourseLibraryPage';
import { TrainingCredentialsPage } from './pages/training/TrainingCredentialsPage';
import { FinancePage } from './pages/FinancePage';
import { CampaignsPage } from './pages/CampaignsPage';
import { AdminPage } from './pages/AdminPage';
import { ChangePasswordPage } from './pages/ChangePasswordPage';
import { AUTH_TOKEN } from '../lib/api';

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem(AUTH_TOKEN);
  const role = localStorage.getItem('sbs_role') || 'user';

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen bg-[var(--brand-bg)]">
      <Sidebar currentRole={role} />
      <div className="ml-64 flex flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          <AreaGuard role={role}>{children}</AreaGuard>
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
        <Route
          path="/"
          element={
            <ProtectedLayout>
              <DashboardPage />
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
          <Route path="materials" element={<TrainingMaterialsAttendancePage />} />
          <Route path="library" element={<TrainingCourseLibraryPage />} />
          <Route path="credentials" element={<TrainingCredentialsPage />} />
        </Route>
        <Route
          path="/finance"
          element={
            <ProtectedLayout>
              <FinancePage />
            </ProtectedLayout>
          }
        />
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
