import { Routes, Route } from "react-router-dom";
import { HomePage } from "./pages/HomePage.tsx";
import { JoinPage } from "./pages/JoinPage.tsx";
import { RoomPage } from "./pages/RoomPage.tsx";
import { SocketProvider } from "./providers/SocketProvider.tsx";
import { YjsProvider } from "./providers/YjsProvider.tsx";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/room/:roomCode" element={<JoinPage />} />
      <Route
        path="/room/:roomCode/session"
        element={
          <SocketProvider>
            <YjsProvider>
              <RoomPage />
            </YjsProvider>
          </SocketProvider>
        }
      />
    </Routes>
  );
}
