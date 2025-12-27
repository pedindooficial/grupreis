import { Outlet } from "react-router-dom";

export default function LocationCaptureLayout() {
  console.log("📍 LocationCaptureLayout rendered");
  // For nested routes, React Router uses Outlet instead of children
  // Location capture page handles its own full-screen layout
  return <Outlet />;
}

