import { HashRouter as BrowserRouter, Route, Routes } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import { useStorage } from './hooks/useStorage';
import { Analytics } from './pages/Analytics';
import { Calculator } from './pages/Calculator';
import { Dashboard } from './pages/Dashboard';
import { Export } from './pages/Export';
import { History } from './pages/History';
import { Import } from './pages/Import';
import { Intro } from './pages/Intro';
import { Melders } from './pages/Melders';
import { Roles } from './pages/Roles';
import { Review2025 } from './pages/Review2025';
import { Settings } from './pages/Settings';
import { Trends } from './pages/Trends';

export default function App() {
  const { storage, update } = useStorage();

  return (
    <BrowserRouter>
      <div className="flex min-h-screen" style={{ background: '#F1F1F1' }}>
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Intro />} />
            <Route path="/roles" element={<Roles storage={storage} onSave={update} />} />
            <Route path="/dashboard" element={<Dashboard storage={storage} />} />
            <Route path="/calculator" element={<Calculator storage={storage} onSave={update} />} />
            <Route path="/melders" element={<Melders storage={storage} onSave={update} />} />
            <Route path="/history" element={<History storage={storage} onSave={update} />} />
            <Route path="/history/:melderId" element={<History storage={storage} onSave={update} />} />
            <Route path="/trends" element={<Trends storage={storage} />} />
            <Route path="/analytics" element={<Analytics storage={storage} />} />
            <Route path="/review-2025" element={<Review2025 />} />
            <Route path="/import" element={<Import storage={storage} onSave={update} />} />
            <Route path="/export" element={<Export storage={storage} />} />
            <Route path="/settings" element={<Settings storage={storage} onSave={update} />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
