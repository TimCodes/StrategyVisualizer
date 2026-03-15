import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Github, Download, Circle } from "lucide-react";

export default function Header() {
  return (
    <header className="bg-github-bg border-b border-github-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-4">
            <Github className="text-2xl text-github-text" />
            <h1 className="text-xl font-semibold text-github-text">Monorepo Architecture POC</h1>
          </div>
          <div className="flex items-center space-x-4">
            <Badge className="bg-github-green text-white hover:bg-github-green/90">
              <Circle className="w-2 h-2 mr-1 fill-current" />
              Active
            </Badge>
            <Button className="bg-github-blue hover:bg-github-blue/90 text-white">
              <Download className="w-4 h-4 mr-2" />
              Clone Repository
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
