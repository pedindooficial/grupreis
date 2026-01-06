import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './lib/auth-context';
import { ProtectedRoute } from './components/ProtectedRoute';
import RootLayout from './app/layout';
import LoginPage from './pages/LoginPage';
import DashboardLayout from './app/(dashboard)/layout';
import DashboardPage from './app/(dashboard)/page';
import ClientsPage from './app/(dashboard)/clients/page';
import NewClientPage from './app/(dashboard)/clients/new/page';
import JobsPage from './app/(dashboard)/jobs/page';
import NewJobPage from './app/(dashboard)/jobs/new/page';
import EmployeesPage from './app/(dashboard)/employees/page';
import TeamsPage from './app/(dashboard)/teams/page';
import TeamJobsPage from './app/(dashboard)/teams/[id]/jobs/page';
import MachinesPage from './app/(dashboard)/machines/page';
import EquipmentPage from './app/(dashboard)/equipment/page';
import CashPage from './app/(dashboard)/cash/page';
import CatalogPage from './app/(dashboard)/catalog/page';
import DocumentsPage from './app/(dashboard)/documents/page';
import AuditPage from './app/(dashboard)/audit/page';
import SettingsPage from './app/(dashboard)/settings/page';
import OrcamentoRequestsPage from './app/(dashboard)/orcamento-requests/page';
import RoadmapPage from './app/(dashboard)/roadmap/page';
import SocialPage from './app/(dashboard)/social/page';
import OperationsPage from './app/operations/[token]/page';
import OperationsTeamPage from './app/operations/team/[id]/page';
import LocationCapturePage from './app/location-capture/[token]/page';
import LocationCaptureLayout from './app/location-capture/layout';

function App() {
  return (
    <AuthProvider>
      <RootLayout>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          
          {/* Operations routes (public with token) */}
          <Route path="/operations/:token" element={<OperationsPage />} />
          <Route path="/operations/team/:id" element={<OperationsTeamPage />} />
          
          {/* Location capture routes (public with token) */}
          <Route path="/location-capture" element={<LocationCaptureLayout />}>
            <Route path=":token" element={<LocationCapturePage />} />
          </Route>

          {/* Protected dashboard routes */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Routes>
                    <Route path="/" element={<DashboardPage />} />
                    <Route path="/clients" element={<ClientsPage />} />
                    <Route path="/clients/new" element={<NewClientPage />} />
                    <Route path="/jobs" element={<JobsPage />} />
                    <Route path="/jobs/new" element={<NewJobPage />} />
                    <Route path="/employees" element={<EmployeesPage />} />
                    <Route path="/teams" element={<TeamsPage />} />
                    <Route path="/teams/:id/jobs" element={<TeamJobsPage />} />
                    <Route path="/machines" element={<MachinesPage />} />
                    <Route path="/equipment" element={<EquipmentPage />} />
                    <Route path="/cash" element={<CashPage />} />
                    <Route path="/catalog" element={<CatalogPage />} />
                    <Route path="/documents" element={<DocumentsPage />} />
                    <Route path="/audit" element={<AuditPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/orcamento-requests" element={<OrcamentoRequestsPage />} />
                    <Route path="/roadmap" element={<RoadmapPage />} />
                    <Route path="/social" element={<SocialPage />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </RootLayout>
    </AuthProvider>
  );
}

export default App;

