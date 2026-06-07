import { Navigate, Outlet } from "react-router-dom";
import useStore from "../../store/useStore.js";

export default function ProtectedRoute() {
  const token = useStore((s) => s.token);
  if (!token) return <Navigate to="/welcome" replace />;
  return <Outlet />;
}
