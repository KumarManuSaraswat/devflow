import { Route, Routes } from "react-router-dom";
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
import LandingPage from "./pages/LandingPage";
import PageTransition from "./components/motion/PageTransition";
import AssistantPage from "./pages/AssistantPage";
import DiscussionsPage from "./pages/DiscussionsPage";
import DiscussionPage from "./pages/DiscussionPage";

const App = () => {
  return (
    <Routes>
      <Route element={<PageTransition />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<PageTransition />}>
          <Route path="/invite/:token" element={<InvitePage />} />
        </Route>

        <Route element={<AppLayout />}>
          <Route path="/assistant" element={<AssistantPage />} />
          <Route path="/teams" element={<TeamsPage />} />
          <Route path="/teams/:teamId" element={<TeamPage />} />
          <Route path="/teams/:teamId/discussions" element={<DiscussionsPage />} />
          <Route path="/teams/:teamId/discussions/:topicId" element={<DiscussionPage />} />
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

    </Routes>
  );
};

export default App;
