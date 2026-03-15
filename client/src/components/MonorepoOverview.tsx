import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Link, Rocket, PlayCircle, Settings, CheckCircle, GitBranch, ArrowUp, ArrowDown } from "lucide-react";

export default function MonorepoOverview() {
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-github-blue to-github-purple rounded-lg p-8 text-white">
        <h2 className="text-3xl font-bold mb-4">Modern Monorepo Architecture</h2>
        <p className="text-lg opacity-90 mb-6">
          A proof of concept demonstrating scalable monorepo patterns with independent packages,
          shared utilities, workspace management, and complete Docker orchestration.
        </p>
        <div className="flex flex-wrap gap-4">
          <Badge className="bg-white bg-opacity-20 hover:bg-white hover:bg-opacity-30">
            <Package className="w-3 h-3 mr-1" />
            3 Packages
          </Badge>
          <Badge className="bg-white bg-opacity-20 hover:bg-white hover:bg-opacity-30">
            <Link className="w-3 h-3 mr-1" />
            Shared Dependencies
          </Badge>
          <Badge className="bg-white bg-opacity-20 hover:bg-white hover:bg-opacity-30">
            <Rocket className="w-3 h-3 mr-1" />
            Docker Orchestration
          </Badge>
          <Badge className="bg-white bg-opacity-20 hover:bg-white hover:bg-opacity-30">
            <Settings className="w-3 h-3 mr-1" />
            Production Ready
          </Badge>
        </div>
      </div>

      {/* Quick Start and Features */}
      <div className="grid lg:grid-cols-2 gap-8">
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <PlayCircle className="text-github-green mr-2" />
              Quick Start
            </h3>
            <div className="space-y-3">
              <div className="bg-github-bg rounded-md p-3 font-mono text-sm border border-github-border">
                <span className="text-gray-500">$</span> npm install
              </div>
              <div className="bg-github-bg rounded-md p-3 font-mono text-sm border border-github-border">
                <span className="text-gray-500">$</span> npm run dev
              </div>
              <div className="bg-github-bg rounded-md p-3 font-mono text-sm border border-github-border">
                <span className="text-gray-500">$</span> docker-compose up -d
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Settings className="text-github-purple mr-2" />
              Architecture Features
            </h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center">
                <CheckCircle className="text-github-green mr-2 w-4 h-4" />
                NPM Workspaces Configuration
              </li>
              <li className="flex items-center">
                <CheckCircle className="text-github-green mr-2 w-4 h-4" />
                Docker Container Orchestration
              </li>
              <li className="flex items-center">
                <CheckCircle className="text-github-green mr-2 w-4 h-4" />
                Shared TypeScript Types
              </li>
              <li className="flex items-center">
                <CheckCircle className="text-github-green mr-2 w-4 h-4" />
                Independent Package Deployment
              </li>
              <li className="flex items-center">
                <CheckCircle className="text-github-green mr-2 w-4 h-4" />
                Automated CI/CD Pipeline
              </li>
              <li className="flex items-center">
                <CheckCircle className="text-github-green mr-2 w-4 h-4" />
                Hot Module Replacement
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Dependency Graph */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <GitBranch className="text-github-purple mr-2" />
            Dependency Graph
          </h3>
          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-orange-800">@poc/core</h4>
                <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-200">Shared</Badge>
              </div>
              <p className="text-sm text-orange-700 mb-2">Utilities, types, and shared logic</p>
              <div className="text-xs text-orange-600 flex items-center">
                <ArrowUp className="w-3 h-3 mr-1" />
                Used by: client, server
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-green-800">@poc/client</h4>
                <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Frontend</Badge>
              </div>
              <p className="text-sm text-green-700 mb-2">React-based web interface</p>
              <div className="text-xs text-green-600 flex items-center">
                <ArrowDown className="w-3 h-3 mr-1" />
                Depends on: @poc/core
              </div>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-purple-800">@poc/server</h4>
                <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-200">Backend</Badge>
              </div>
              <p className="text-sm text-purple-700 mb-2">Express.js API server</p>
              <div className="text-xs text-purple-600 flex items-center">
                <ArrowDown className="w-3 h-3 mr-1" />
                Depends on: @poc/core
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
