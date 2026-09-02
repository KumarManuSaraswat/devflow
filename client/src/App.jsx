import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import AppLayout from "./components/layout/AppLayout";
import LoginPage from "./pages/LoginPage";
import NotFoundPage from "./pages/NotFoundPage";
import RegisterPage from "./pages/RegisterPage";
import TeamPage from "./pages/TeamPage";
import TeamsPage from "./pages/TeamsPage";
import ProjectPage from "./pages/ProjectPage";
import TaskPage from "./pages/TaskPage";
import TeamMembersPage from "./pages/TeamMembersPage";
import InvitePage from "./pages/InvitePage";

const App = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/invite/:token" element={<InvitePage />} />

        <Route element={<AppLayout />}>
          <Route path="/teams" element={<TeamsPage />} />
          <Route path="/teams/:teamId" element={<TeamPage />} />
          <Route
            path="/teams/:teamId/members"
            element={<TeamMembersPage />}
          />
          <Route
            path="/projects/:projectId"
            element={<ProjectPage />}
          />
          <Route path="/tasks/:taskId" element={<TaskPage />} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/teams" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

export default App;