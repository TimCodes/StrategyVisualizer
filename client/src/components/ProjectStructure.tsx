import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Folder, File, FolderTree, GitBranch, ArrowUp, ArrowDown } from "lucide-react";

export default function ProjectStructure() {
  return (
    <div className="grid lg:grid-cols-2 gap-8">
      {/* File Tree */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <FolderTree className="text-github-blue mr-2" />
            Directory Structure
          </h3>
          <div className="font-mono text-sm space-y-1">
            <div className="flex items-center">
              <Folder className="text-blue-500 mr-2 w-4 h-4" />
              <span className="font-medium">monorepo-poc/</span>
            </div>
            <div className="ml-4 flex items-center">
              <File className="text-gray-400 mr-2 w-4 h-4" />
              <span>package.json</span>
            </div>
            <div className="ml-4 flex items-center">
              <File className="text-gray-400 mr-2 w-4 h-4" />
              <span>README.md</span>
            </div>
            <div className="ml-4 flex items-center">
              <Folder className="text-blue-500 mr-2 w-4 h-4" />
              <span className="font-medium">packages/</span>
            </div>
            <div className="ml-8 flex items-center">
              <Folder className="text-green-500 mr-2 w-4 h-4" />
              <span className="font-medium text-github-green">client/</span>
            </div>
            <div className="ml-12 flex items-center text-xs text-gray-500">
              <File className="mr-2 w-3 h-3" />
              <span>package.json</span>
            </div>
            <div className="ml-12 flex items-center text-xs text-gray-500">
              <Folder className="mr-2 w-3 h-3" />
              <span>src/</span>
            </div>
            <div className="ml-8 flex items-center">
              <Folder className="text-purple-500 mr-2 w-4 h-4" />
              <span className="font-medium text-github-purple">server/</span>
            </div>
            <div className="ml-12 flex items-center text-xs text-gray-500">
              <File className="mr-2 w-3 h-3" />
              <span>package.json</span>
            </div>
            <div className="ml-12 flex items-center text-xs text-gray-500">
              <Folder className="mr-2 w-3 h-3" />
              <span>src/</span>
            </div>
            <div className="ml-8 flex items-center">
              <Folder className="text-orange-500 mr-2 w-4 h-4" />
              <span className="font-medium text-orange-600">core/</span>
            </div>
            <div className="ml-12 flex items-center text-xs text-gray-500">
              <File className="mr-2 w-3 h-3" />
              <span>package.json</span>
            </div>
            <div className="ml-12 flex items-center text-xs text-gray-500">
              <Folder className="mr-2 w-3 h-3" />
              <span>src/</span>
            </div>
          </div>
        </CardContent>
      </Card>

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
