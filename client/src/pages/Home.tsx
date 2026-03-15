import { useState } from "react";
import Header from "@/components/Header";
import Navigation from "@/components/Navigation";
import MonorepoOverview from "@/components/MonorepoOverview";
import ProjectStructure from "@/components/ProjectStructure";
import PackagesView from "@/components/PackagesView";
import WorkflowView from "@/components/WorkflowView";
import DockerView from "@/components/DockerView";

export default function Home() {
  const [activeTab, setActiveTab] = useState("overview");

  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return <MonorepoOverview />;
      case "structure":
        return <ProjectStructure />;
      case "packages":
        return <PackagesView />;
      case "workflow":
        return <WorkflowView />;
      case "docker":
        return <DockerView />;
      default:
        return <MonorepoOverview />;
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans text-github-text">
      <Header />
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderTabContent()}
      </main>
    </div>
  );
}
