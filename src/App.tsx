import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { TemplatesPage } from './pages/TemplatesPage';
import { ProfilePage } from './pages/ProfilePage';
import { PromotionPage } from './pages/PromotionPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<TemplatesPage />} />
          <Route path="/start" element={<ProfilePage />} />
          <Route path="/promotion" element={<PromotionPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
