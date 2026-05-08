import { createBrowserRouter } from "react-router";
import { DashboardLayout } from "./components/DashboardLayout";
import { ConversationsPage } from "./pages/ConversationsPage";
import { AgentsPage } from "./pages/AgentsPage";
import { WorkspacesPage } from "./pages/WorkspacesPage";
import { IdeasPage } from "./pages/IdeasPage";
import { PipelinePage } from "./pages/PipelinePage";
import { ForgePage } from "./pages/ForgePage";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: DashboardLayout,
    children: [
      { index: true, Component: IdeasPage },
      { path: "conversations", Component: ConversationsPage },
      { path: "agents", Component: AgentsPage },
      { path: "workspaces", Component: WorkspacesPage },
      { path: "pipeline", Component: PipelinePage },
      { path: "forge", Component: ForgePage },
    ],
  },
]);