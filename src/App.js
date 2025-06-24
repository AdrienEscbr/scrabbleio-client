
import React, { useState, useEffect } from "react";
import openSocket from "socket.io-client";
import {BrowserRouter, HashRouter, Routes, Route} from "react-router-dom";

import { FreeCamera, Vector3, HemisphericLight, MeshBuilder } from "@babylonjs/core";
import GameSceneComponent from "./Components/Game/GameSceneComponent"; // uses above component in same directory
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


const ENDPOINT = "https://dekou-server.onrender.com";
const socket = openSocket(process.env.ENDPOINT || ENDPOINT, { transports: ['websocket'] });


function App() {

  return(
    // <BrowserRouter>
    <HashRouter basename={process.env.PUBLIC_URL || "/dekou-client"}>
      <Routes>
          <Route index element={<HomeComponent />}/>
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
