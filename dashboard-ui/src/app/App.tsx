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
import { TrainingClassicSubPage } from './pages/training/TrainingClassicSubPage';
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
          <Route
            path="presenter"
            element={
              <TrainingClassicSubPage
                hashPath="/training/training-presenter-tools"
                description="Presenter tools (QR, script, teleprompter) live in the classic trainer bundle for now."
              />
            }
          />
          <Route
            path="classroom"
            element={
              <TrainingClassicSubPage
                hashPath="/training/training-classroom"
                description="Full classroom experience (live session, whiteboard, polls) is embedded from the classic dashboard."
              />
            }
          />
          <Route
            path="materials"
            element={
              <TrainingClassicSubPage
                hashPath="/training/training-tools"
                description="Attendance and materials are opened in the classic training workspace."
              />
            }
          />
          <Route
            path="library"
            element={
              <TrainingClassicSubPage
                hashPath="/training/training-course-library"
                description="Course library uses the same APIs as legacy; UI is embedded from classic."
              />
            }
          />
          <Route
            path="credentials"
            element={
              <TrainingClassicSubPage
                hashPath="/training/training-credentials"
                description="Credential center opens inside the classic shell."
              />
            }
          />
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
