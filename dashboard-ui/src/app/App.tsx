import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { OperationsPage } from './pages/OperationsPage';
import { TrainingPage } from './pages/TrainingPage';
import { LegacyClassicRedirect } from './LegacyClassicRedirect';
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
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
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
              <OperationsPage />
            </ProtectedLayout>
          }
        />
        <Route
          path="/training"
          element={
            <ProtectedLayout>
              <TrainingPage />
            </ProtectedLayout>
          }
        />
        <Route
          path="/classroom"
          element={
            <ProtectedLayout>
              <LegacyClassicRedirect module="classroom" />
            </ProtectedLayout>
          }
        />
        <Route
          path="/finance"
          element={
            <ProtectedLayout>
              <LegacyClassicRedirect module="finance" />
            </ProtectedLayout>
          }
        />
        <Route
          path="/automation"
          element={
            <ProtectedLayout>
              <LegacyClassicRedirect module="automation" />
            </ProtectedLayout>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedLayout>
              <LegacyClassicRedirect module="admin" />
            </ProtectedLayout>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
