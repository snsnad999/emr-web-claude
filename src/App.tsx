import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider as ReduxProvider } from 'react-redux';
import { Toaster } from 'sonner';

import theme from '@/theme';
import { store } from '@/store/store';
import { AuthProvider } from '@/context/AuthContext';
import { AppProvider } from '@/context/AppContext';
// ProtectedRoute and Login bypassed during development (auth disabled)
// import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';

// import Login from '@/pages/Auth/Login';
import QueueDashboard from '@/pages/Dashboard/Index';
import PatientList from '@/pages/Patients/PatientList';
import PatientDetail from '@/pages/Patients/PatientDetail';
import PrescriptionCard from '@/pages/Prescription/PrescriptionCard';
import AddPrescriptionPage from '@/pages/Prescription/AddPrescriptionPage';
import Analytics from '@/pages/Analytics/Analytics';
import Payments from '@/pages/Payments/Payments';
import ProfilePage from '@/pages/Profile/ProfilePage';
import BulkImportPage from '@/pages/Profile/BulkImportPage';
import BulkImportUploadPage from '@/pages/Profile/BulkImportUploadPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <QueryClientProvider client={queryClient}>
          <ReduxProvider store={store}>
            <AuthProvider>
              <AppProvider>
                <Toaster
                  position="top-right"
                  richColors
                  closeButton
                  toastOptions={{ duration: 4000 }}
                />
                <Routes>
                  {/* Auth disabled — redirect /login to home */}
                  <Route path="/login" element={<Navigate to="/" replace />} />

                  {/* All routes open (auth disabled) */}
                  <Route element={<Layout />}>
                    <Route index element={<QueueDashboard />} />
                    <Route path="patients" element={<PatientList />} />
                    <Route path="patient/:id" element={<PatientDetail />} />
                    <Route path="visit-details/:patientId" element={<PrescriptionCard />} />
                    <Route path="prescription-final" element={<AddPrescriptionPage />} />
                    <Route path="analytics" element={<Analytics />} />
                    <Route path="payments" element={<Payments />} />
                    <Route path="profile" element={<ProfilePage />} />
                    <Route path="profile/import-data" element={<BulkImportPage />} />
                    <Route path="profile/import-data/:section" element={<BulkImportUploadPage />} />
                  </Route>

                  {/* Catch-all */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </AppProvider>
            </AuthProvider>
          </ReduxProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
