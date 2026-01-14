import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { memo } from 'react';
import MapView from './components/MapView';
import About from './components/About';
import { ErrorBoundary } from './components/ErrorBoundary';
import './App.css';

const AppFooter = memo(function AppFooter() {
  return (
    <footer className="app-footer">
      <Link to="/about" className="app-footer-link">
        About
      </Link>
    </footer>
  );
});

function AppContent() {
  const location = useLocation();

  return (
    <>
      {/* Navigation header */}
      <div className="app-header">
        <div className="app-header-content">
          <Link to="/" className="app-header-title">
            <h1>NJ Transit</h1>
          </Link>
          <nav className="app-header-nav">
            {location.pathname === '/' && (
              <Link to="/about" className="app-header-nav-link">
                About
              </Link>
            )}
            {location.pathname === '/about' && (
              <Link to="/" className="app-header-nav-link">
                Map
              </Link>
            )}
          </nav>
        </div>
      </div>

      <Routes>
        <Route path="/" element={<MapView />} />
        <Route path="/about" element={<About />} />
      </Routes>

      {/* Footer - only show on map view */}
      {location.pathname === '/' && <AppFooter />}
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;

