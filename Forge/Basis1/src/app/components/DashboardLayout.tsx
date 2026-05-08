import { Outlet, Link, useLocation } from "react-router";
import { 
  MessageSquare, 
  Grid3x3, 
  AlertCircle, 
  List, 
  BarChart3, 
  Layers, 
  Settings,
  Bell,
  SettingsIcon,
  Maximize2,
  Minimize2,
  X,
  Flame
} from "lucide-react";

export function DashboardLayout() {
  const location = useLocation();

  const navItems = [
    { icon: Grid3x3, path: "/", label: "Ideas" },
    { icon: MessageSquare, path: "/conversations", label: "Conversations" },
    { icon: AlertCircle, path: "/agents", label: "Agents" },
    { icon: List, path: "/pipeline", label: "Pipeline" },
    { icon: Flame, path: "/forge", label: "Forge" },
    { icon: BarChart3, path: "/analytics", label: "Analytics" },
    { icon: Layers, path: "/workspaces", label: "Workspaces" },
    { icon: Settings, path: "/settings", label: "Settings" },
  ];

  return (
    <div className="flex h-screen bg-black text-white">
      {/* Sidebar */}
      <aside className="w-16 bg-[#0a0a0a] border-r border-[#1a1a1a] flex flex-col items-center py-4 gap-2">
        {/* Logo */}
        <Link to="/" className="mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-[#ff6b3d] to-[#ff4d1a] rounded-lg flex items-center justify-center">
            <Grid3x3 className="w-6 h-6 text-white" />
          </div>
        </Link>

        {/* Navigation Icons */}
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={index}
              to={item.path}
              className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors relative ${
                isActive 
                  ? "bg-[#ff6b3d] text-white" 
                  : "text-gray-400 hover:text-white hover:bg-[#1a1a1a]"
              }`}
            >
              <Icon className="w-5 h-5" />
              {isActive && (
                <div className="absolute left-0 w-1 h-6 bg-[#ff6b3d] rounded-r" />
              )}
            </Link>
          );
        })}
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-16 bg-[#0a0a0a] border-b border-[#1a1a1a] flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-[#ff6b3d] font-bold tracking-wider">
                  NEUROFORGE
                </h1>
                <span className="text-[10px] text-yellow-400 font-bold bg-yellow-400/10 px-2 py-0.5 rounded border border-yellow-400/30">
                  DEVELOPER
                </span>
                <span className="text-[10px] text-yellow-400 font-bold bg-yellow-400/10 px-2 py-0.5 rounded border border-yellow-400/30">
                  MODE
                </span>
              </div>
              <p className="text-[10px] text-gray-500 tracking-wider uppercase">
                Neural Operations Dashboard
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            <button className="relative w-9 h-9 rounded-lg bg-[#1a1a1a] hover:bg-[#252525] flex items-center justify-center transition-colors">
              <Bell className="w-4 h-4 text-gray-400" />
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#ff6b3d] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                3
              </span>
            </button>

            {/* Settings */}
            <button className="w-9 h-9 rounded-lg bg-[#1a1a1a] hover:bg-[#252525] flex items-center justify-center transition-colors">
              <SettingsIcon className="w-4 h-4 text-gray-400" />
            </button>

            {/* Expand */}
            <button className="w-9 h-9 rounded-lg bg-[#1a1a1a] hover:bg-[#252525] flex items-center justify-center transition-colors">
              <Maximize2 className="w-4 h-4 text-gray-400" />
            </button>

            {/* Fullscreen */}
            <button className="w-9 h-9 rounded-lg bg-[#1a1a1a] hover:bg-[#252525] flex items-center justify-center transition-colors">
              <Minimize2 className="w-4 h-4 text-gray-400" />
            </button>

            {/* Close */}
            <button className="w-9 h-9 rounded-lg bg-[#1a1a1a] hover:bg-[#252525] flex items-center justify-center transition-colors">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}