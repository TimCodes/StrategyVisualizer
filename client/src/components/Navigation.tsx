import { Home, FolderTree, Package, Workflow, Container } from "lucide-react";

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function Navigation({ activeTab, onTabChange }: NavigationProps) {
  const tabs = [
    { id: "overview", label: "Overview", icon: Home },
    { id: "structure", label: "Project Structure", icon: FolderTree },
    { id: "packages", label: "Packages", icon: Package },
    { id: "workflow", label: "Workflow", icon: Workflow },
    { id: "docker", label: "Docker", icon: Container },
  ];

  return (
    <nav className="bg-white border-b border-github-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`border-b-2 py-4 px-1 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "border-github-blue text-github-blue"
                    : "border-transparent text-gray-500 hover:text-github-text"
                }`}
              >
                <Icon className="w-4 h-4 mr-2 inline" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
