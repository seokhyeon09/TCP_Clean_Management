import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import ZoneDashboard from './pages/ZoneDashboard';
import ZoneOverview from './pages/ZoneOverview';
import Navbar from './components/Navbar';
import SimulatorModal from './components/SimulatorModal';

function MainApp() {
  const { user, isAdmin } = useAuth();
  const [currentView, setCurrentView] = useState(user?.role === 'ADMIN' ? 'admin' : 'overview');
  const [targetZoneId, setTargetZoneId] = useState(null);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Reset view whenever user changes (e.g. toilet manager -> admin or logout -> login)
  React.useEffect(() => {
    if (user) {
      if (user.role === 'ADMIN') {
        setCurrentView('admin');
      } else {
        setCurrentView('overview');
      }
      setTargetZoneId(null);
    }
  }, [user?.id, user?.role]);

  if (!user) {
    return <LoginPage />;
  }

  // Fallback: non-admin users cannot access 'admin' console
  const effectiveView = (!isAdmin && currentView === 'admin') ? 'overview' : currentView;

  const handleSelectZone = (zoneId) => {
    setTargetZoneId(zoneId);
    setCurrentView('dashboard');
  };

  const handleSimulatorDataSent = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      <Navbar
        currentView={effectiveView}
        setCurrentView={setCurrentView}
        onOpenSimulator={() => setIsSimulatorOpen(true)}
      />

      <main className="flex-1 pb-16">
        {effectiveView === 'admin' && (
          <AdminDashboard
            key={`admin-${user?.id}-${refreshTrigger}`}
            onSelectZone={handleSelectZone}
          />
        )}
        {effectiveView === 'overview' && (
          <ZoneOverview
            key={`overview-${user?.id}-${refreshTrigger}`}
            onSelectZone={handleSelectZone}
          />
        )}
        {effectiveView === 'dashboard' && (
          <ZoneDashboard
            key={`zone-${user?.id}-${targetZoneId}-${refreshTrigger}`}
            initialZoneId={targetZoneId}
          />
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-400">
        <p>IoT 스마트 화장실 원격 관제 솔루션 | TCP Clean Management 2026</p>
      </footer>

      {/* Simulator Modal */}
      <SimulatorModal
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        onDataSent={handleSimulatorDataSent}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
