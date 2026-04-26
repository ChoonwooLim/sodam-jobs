import { Navigate } from "react-router-dom";

const ROLE_HIERARCHY = { user: 0, employer: 1, admin: 2, superadmin: 3 };

function passesRole(userRole, required) {
  // Both unknown values fail-secure:
  //   unknown user role -> denied (-1 < anything)
  //   unknown required role -> denied (Infinity > everything), so caller typos block access
  const have = ROLE_HIERARCHY[userRole] ?? -1;
  const need = ROLE_HIERARCHY[required] ?? Infinity;
  return have >= need;
}

export default function ProtectedRoute({ children, requiredRole }) {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "null");

  if (!token) return <Navigate to="/login" replace />;
  if (requiredRole && !passesRole(user?.role, requiredRole)) {
    return <Navigate to="/" replace />;
  }
  return children;
}
