import { Route, Routes } from "react-router-dom";
import GamePage from "./pages/GamePage";
import NotFoundPage from "./pages/NotFoundPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<GamePage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
