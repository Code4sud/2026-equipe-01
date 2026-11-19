import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Landing } from './routes/Landing';
import { YouthApp } from './routes/YouthApp';
import { Pro } from './routes/Pro';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Landing />} />
        {/* Route-layout : la fiche et Mon Profil s’ouvrent DANS le téléphone, sans le démonter. */}
        <Route path="/app" element={<YouthApp />}>
          <Route index element={null} />
          <Route path="details/:videoId" element={null} />
          <Route path="profil" element={null} />
        </Route>
        <Route path="/pro" element={<Pro />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
