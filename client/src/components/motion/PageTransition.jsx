import { Outlet, useLocation } from "react-router-dom";

export default function PageTransition() {
  const { pathname } = useLocation();

  return (
    <div key={pathname} className="page-transition">
      <Outlet />
    </div>
  );
}
