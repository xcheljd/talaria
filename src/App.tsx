import { lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';

// Route pages are code-split so the initial bundle stays small and the app
// shell paints before the heavy page chunks (newsletter editor, email
// generation, zip/pdf libs) are parsed — a meaningful cold-start win in
// WebKit/WKWebView. Named exports are mapped to a default for React.lazy.
const ProfilePage = lazy(() =>
  import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage }))
);
const PromotionPage = lazy(() =>
  import('./pages/PromotionPage').then((m) => ({ default: m.PromotionPage }))
);
const ComponentsShowcase = lazy(() =>
  import('./pages/ComponentsShowcase').then((m) => ({
    default: m.ComponentsShowcase,
  }))
);
import { Toaster } from './components/ui/sonner';
import { TooltipProvider } from './components/ui/tooltip';
import { ThemeProvider } from './contexts/ThemeProvider';
import { ProfileProvider } from './contexts/ProfileProvider';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useGlobalDropGuard } from './hooks/useGlobalDropGuard';

function App() {
  useGlobalDropGuard();
  return (
    <ThemeProvider>
      <ProfileProvider>
        <TooltipProvider delayDuration={200}>
          <BrowserRouter>
            <Routes>
              <Route element={<Layout />}>
                {/* Root always lands on the promotion builder. */}
                <Route
                  path="/"
                  element={<Navigate to="/promotion" replace />}
                />
                <Route
                  path="/settings"
                  element={
                    <ErrorBoundary level="route" key="route-/settings">
                      <ProfilePage />
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/promotion"
                  element={
                    <ErrorBoundary level="route" key="route-/promotion">
                      <PromotionPage />
                    </ErrorBoundary>
                  }
                />
                {import.meta.env.DEV && (
                  <Route
                    path="/components"
                    element={
                      <ErrorBoundary level="route" key="route-/components">
                        <ComponentsShowcase />
                      </ErrorBoundary>
                    }
                  />
                )}
              </Route>
            </Routes>
          </BrowserRouter>
          <Toaster />
        </TooltipProvider>
      </ProfileProvider>
    </ThemeProvider>
  );
}

export default App;
