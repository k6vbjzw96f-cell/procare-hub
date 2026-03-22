import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import LandingPage from '@/pages/LandingPage';
import Login from '@/pages/Login';
import Privacy from '@/pages/Privacy';
import Terms from '@/pages/Terms';
import Dashboard from '@/pages/Dashboard';
import Clients from '@/pages/Clients';
import Staff from '@/pages/Staff';
import Rostering from '@/pages/Rostering';
import Invoices from '@/pages/Invoices';
import Compliance from '@/pages/Compliance';
import Reports from '@/pages/Reports';
import HourLogging from '@/pages/HourLogging';
import Vehicles from '@/pages/Vehicles';
import SILHouses from '@/pages/SILHouses';
import Facilities from '@/pages/Facilities';
import Leave from '@/pages/Leave';
import Settings from '@/pages/Settings';
import Medication from '@/pages/Medication';
import Goals from '@/pages/Goals';
import Communication from '@/pages/Communication';
import Payments from '@/pages/Payments';
import ComplianceCalendar from '@/pages/ComplianceCalendar';
import Feedback from '@/pages/Feedback';
import Documents from '@/pages/Documents';
import TeamAvailability from '@/pages/TeamAvailability';
import HR from '@/pages/HR';
import Organisation from '@/pages/Organisation';
import Funding from '@/pages/Funding';
import CaseNotes from '@/pages/CaseNotes';
import ServiceBookings from '@/pages/ServiceBookings';
import Resources from '@/pages/Resources';
import Community from '@/pages/Community';
import Layout from '@/components/Layout';
import PWAInstallPrompt from '@/components/PWAInstallPrompt';
import * as serviceWorkerRegistration from '@/serviceWorkerRegistration';
import '@/App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      setIsAuthenticated(true);
      setUser(JSON.parse(userData));
    }
    setLoading(false);

    // Register service worker
    serviceWorkerRegistration.register();

    // Listen for service worker updates
    const handleUpdate = () => {
      toast.info('A new version is available!', {
        action: {
          label: 'Update',
          onClick: () => window.location.reload()
        },
        duration: 10000
      });
    };

    window.addEventListener('swUpdate', handleUpdate);

    return () => {
      window.removeEventListener('swUpdate', handleUpdate);
    };
  }, []);

  const handleLogin = (token, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setIsAuthenticated(true);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setUser(null);
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          {/* Landing Page - shown to non-authenticated users at root */}
          <Route
            path="/"
            element={
              isAuthenticated ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <LandingPage />
              )
            }
          />
          <Route
            path="/login"
            element={
              isAuthenticated ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Login onLogin={handleLogin} />
              )
            }
          />
          {/* SSO Auth Callback Route - handles OAuth redirects */}
          <Route
            path="/auth/callback"
            element={
              isAuthenticated ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Login onLogin={handleLogin} />
              )
            }
          />
          {/* Public pages - Privacy and Terms */}
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          {/* Protected Routes */}
          <Route
            path="/*"
            element={
              isAuthenticated ? (
                <Layout user={user} onLogout={handleLogout}>
                  <Routes>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/clients" element={<Clients />} />
                    <Route path="/staff" element={<Staff />} />
                    <Route path="/team-availability" element={<TeamAvailability />} />
                    <Route path="/hr" element={<HR />} />
                    <Route path="/rostering" element={<Rostering />} />
                    <Route path="/hours" element={<HourLogging />} />
                    <Route path="/vehicles" element={<Vehicles />} />
                    <Route path="/houses" element={<SILHouses />} />
                    <Route path="/facilities" element={<Facilities />} />
                    <Route path="/leave" element={<Leave />} />
                    <Route path="/invoices" element={<Invoices />} />
                    <Route path="/compliance" element={<Compliance />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/medication" element={<Medication />} />
                    <Route path="/goals" element={<Goals />} />
                    <Route path="/communication" element={<Communication />} />
                    <Route path="/payments" element={<Payments />} />
                    <Route path="/calendar" element={<ComplianceCalendar />} />
                    <Route path="/feedback" element={<Feedback />} />
                    <Route path="/documents" element={<Documents />} />
                    <Route path="/organisation" element={<Organisation />} />
                    <Route path="/funding" element={<Funding />} />
                    <Route path="/case-notes" element={<CaseNotes />} />
                    <Route path="/service-bookings" element={<ServiceBookings />} />
                    <Route path="/resources" element={<Resources />} />
                    <Route path="/community" element={<Community />} />
                    <Route path="/settings" element={<Settings />} />
                  </Routes>
                </Layout>
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
      <PWAInstallPrompt />
    </div>
  );
}

export default App;