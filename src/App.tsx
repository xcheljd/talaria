import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { TemplatesPage } from './pages/TemplatesPage';
import { ProfilePage } from './pages/ProfilePage';
import { PromotionPage } from './pages/PromotionPage';
import { ComponentsShowcase } from './pages/ComponentsShowcase';
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
        <TooltipProvider>
          <BrowserRouter>
            <Routes>
              <Route element={<Layout />}>
                <Route
                  path="/"
                  element={
                    <ErrorBoundary level="route" key="route-/">
                      <TemplatesPage />
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/start"
                  element={
                    <ErrorBoundary level="route" key="route-/start">
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
