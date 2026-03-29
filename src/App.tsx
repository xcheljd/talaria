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

function App() {
  return (
    <ThemeProvider>
      <ProfileProvider>
        <TooltipProvider>
          <BrowserRouter>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<TemplatesPage />} />
                <Route path="/start" element={<ProfilePage />} />
                <Route path="/promotion" element={<PromotionPage />} />
                <Route path="/components" element={<ComponentsShowcase />} />
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
