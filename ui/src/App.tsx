import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from './pages/Dashboard';
import Scans from './pages/Scans';
import Assets from './pages/Assets';
import ScanDetail from './pages/ScanDetail';
import AssetDetail from './pages/AssetDetail';
import DriftDashboard from './pages/drift/Dashboard';
import DriftEvents from './pages/drift/Events';
import AssetDrift from './pages/drift/AssetDrift';
import ComplianceDashboard from './pages/compliance/Dashboard';
import ComplianceFrameworks from './pages/compliance/Frameworks';
import FrameworkDetails from './pages/compliance/FrameworkDetails';
import ComplianceAssessment from './pages/compliance/Assessment';
import ComplianceReport from './pages/compliance/Report';
import Settings from './pages/Settings';
import Layout from './components/Layout';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/scans" element={<Scans />} />
            <Route path="/scans/:id" element={<ScanDetail />} />
            <Route path="/assets" element={<Assets />} />
            <Route path="/assets/:id" element={<AssetDetail />} />
            
            {/* Drift Detection Routes */}
            <Route path="/drift" element={<DriftDashboard />} />
            <Route path="/drift/events" element={<DriftEvents />} />
            <Route path="/drift/assets" element={<Assets />} />
            <Route path="/drift/assets/:assetId" element={<AssetDrift />} />
            
            {/* Compliance Routes */}
            <Route path="/compliance" element={<ComplianceDashboard />} />
            <Route path="/compliance/frameworks" element={<ComplianceFrameworks />} />
            <Route path="/compliance/frameworks/:id" element={<FrameworkDetails />} />
            <Route path="/compliance/assess" element={<ComplianceAssessment />} />
            <Route path="/compliance/report" element={<ComplianceReport />} />
            <Route path="/compliance/gap-analysis/:id" element={<div>Gap Analysis (TODO)</div>} />
            <Route path="/compliance/controls/:id" element={<div>Control Details (TODO)</div>} />
            
            {/* Settings Routes */}
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Layout>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
