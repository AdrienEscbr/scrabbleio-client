
import React, { useState, useEffect, useRef } from "react";
import { HashRouter, Routes, Route, useLocation } from "react-router-dom";
import { io } from "socket.io-client";
import "./Styles/App.css";

import HomeComponent from "./Components/HomePage/HomeComponent";
import GameModeComponent from "./Components/GameMode/GameModeComponent";
import NoPage from "./Components/Default/NoPage";
import LobbyComponent from "./Components/Lobby/LobbyComponent";
import RoomComponent from "./Components/Lobby/RoomComponent";
import CreditsComponent from "./Components/Credits/CreditsComponent";
import SettingsComponent from "./Components/Settings/SettingsComponent";
import GameScenePage from "./Components/Game/GameScenePage";
import ResultsComponent from "./Components/Results/ResultsComponent";


const ENDPOINT = "https://scrabbleio-server.onrender.com"; //"http://localhost:3001"
const socket = io(process.env.REACT_APP_ENDPOINT || ENDPOINT, {
  transports: ['websocket'],
  autoConnect: false,
});


function App() {
  const location = useLocation();
  // Keep-alive ping for Render (every 10 minutes when tab is visible, production only)
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    const base = (process.env.REACT_APP_KEEP_ALIVE_URL || process.env.REACT_APP_ENDPOINT || ENDPOINT).replace(/\/$/, '');
    const url = `${base}/health`;
    const intervalMs = 10 * 60 * 1000; // 10 minutes
    let timerId = null;

    const ping = () => {
      fetch(url, { method: 'GET', cache: 'no-store' }).catch(() => {});
    };
    const start = () => {
      if (timerId) return;
      ping();
      timerId = setInterval(ping, intervalMs);
    };
    const stop = () => {
      if (!timerId) return;
      clearInterval(timerId);
      timerId = null;
    };
    const onVis = () => (document.hidden ? stop() : maybeStart());
    const isOnGamePage = () => location.pathname.startsWith('/game/');
    const maybeStart = () => { if (isOnGamePage()) start(); else stop(); };

    document.addEventListener('visibilitychange', onVis);
    if (!document.hidden) maybeStart();
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      stop();
    };
  }, [location.pathname]);

  return(
    // <BrowserRouter>
    <HashRouter>
      <Routes>
          <Route index element={<HomeComponent socket={socket} />}/>
          <Route path="mode" element={<GameModeComponent />}/>
          <Route path="local" element={<LobbyComponent mode={1}/>}/>
          <Route path="multiplayer" element={<LobbyComponent mode={2} socket={socket}/>}/>
          <Route path="room/:roomId" element={<RoomComponent socket={socket} />} />
          <Route path="/game/:roomId" element={<GameScenePage socket={socket}/>} />
          <Route path="/game/:roomId/results" element={<ResultsComponent socket={socket}/>} />
          <Route path="credits" element={<CreditsComponent />}/>
          <Route path="settings" element={<SettingsComponent />}/>
          <Route path="*" element={<NoPage/>}/>
      </Routes>
    </HashRouter>
    //</BrowserRouter> 
  );
}

export default App;
