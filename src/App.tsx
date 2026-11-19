import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Landing } from './routes/Landing';
import { YouthApp } from './routes/YouthApp';
import { Details } from './routes/Details';
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
        <Route path="/app" element={<YouthApp />} />
        <Route path="/app/details/:videoId" element={<Details />} />
        <Route path="/pro" element={<Pro />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
