import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { MotionConfig } from 'motion/react';
import Toaster from './components/Toaster.jsx';
import Home from './screens/home/Home.jsx';
import RoomScreen from './screens/room/RoomScreen.jsx';

// HashRouter: GitHub Pages has no SPA fallback, so deep links (/#/room/ABCDE) must live in the hash.
export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <HashRouter>
        <Routes>
          <Route index element={<Home />} />
          <Route path="room/:code" element={<RoomScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
      <Toaster />
    </MotionConfig>
  );
}
