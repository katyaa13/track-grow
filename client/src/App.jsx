import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/layout/ProtectedRoute.jsx";
import MainPage from "./pages/MainPage.jsx";
import WelcomePage from "./pages/WelcomePage.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/welcome" element={<WelcomePage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Navigate to="/habits" replace />} />
        <Route path="/habits" element={<MainPage />} />
        <Route path="/garden" element={<MainPage />} />
        <Route path="/statistics" element={<MainPage />} />
        <Route path="/achievements" element={<MainPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/habits" replace />} />
    </Routes>
  );
}
