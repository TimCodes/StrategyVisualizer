import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Monitor, Server, Package, Circle, Play, ExternalLink, Book } from "lucide-react";

export default function PackagesView() {
  return (
    <div className="space-y-8">
      {/* Package Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Client Package */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Monitor className="text-github-green text-xl mr-3" />
                <h3 className="text-lg font-semibold">Client</h3>
              </div>
              <Badge className="bg-github-green text-white hover:bg-github-green/90">
                <Circle className="w-2 h-2 mr-1 fill-current" />
                Running
              </Badge>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              React-based frontend application with modern tooling and shared utilities integration.
            </p>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Port:</span>
                <span className="font-mono">3000</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Build Tool:</span>
                <span className="font-mono">Vite</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Framework:</span>
                <span className="font-mono">React 18</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
              <h4 className="text-sm font-medium mb-2">Dependencies</h4>
              <div className="flex flex-wrap gap-1">
                <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                  @poc/core
                </Badge>
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  react
                </Badge>
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  vite
                </Badge>
              </div>
            </div>

            <div className="mt-4 flex space-x-2">
              <Button className="flex-1 bg-github-blue hover:bg-github-blue/90 text-white">
                <Play className="w-4 h-4 mr-1" />
                Start Dev
              </Button>
              <Button variant="outline" size="icon">
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Server Package */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Server className="text-github-purple text-xl mr-3" />
                <h3 className="text-lg font-semibold">Server</h3>
              </div>
              <Badge className="bg-github-green text-white hover:bg-github-green/90">
                <Circle className="w-2 h-2 mr-1 fill-current" />
                Running
              </Badge>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Express.js API server with TypeScript support and shared utility integration.
            </p>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Port:</span>
                <span className="font-mono">3001</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Runtime:</span>
                <span className="font-mono">Node.js</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Framework:</span>
                <span className="font-mono">Express</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
              <h4 className="text-sm font-medium mb-2">Dependencies</h4>
              <div className="flex flex-wrap gap-1">
                <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                  @poc/core
                </Badge>
                <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                  express
                </Badge>
                <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                  cors
                </Badge>
              </div>
            </div>

            <div className="mt-4 flex space-x-2">
              <Button className="flex-1 bg-github-purple hover:bg-github-purple/90 text-white">
                <Play className="w-4 h-4 mr-1" />
                Start Dev
              </Button>
              <Button variant="outline" size="icon">
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Core Package */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Package className="text-orange-500 text-xl mr-3" />
                <h3 className="text-lg font-semibold">Core</h3>
              </div>
              <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">
                Built
              </Badge>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Shared utilities, types, and business logic used by both client and server packages.
            </p>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Port:</span>
                <span className="font-mono text-gray-400">N/A</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Type:</span>
                <span className="font-mono">Library</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Language:</span>
                <span className="font-mono">TypeScript</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
              <h4 className="text-sm font-medium mb-2">Dependencies</h4>
              <div className="flex flex-wrap gap-1">
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  typescript
                </Badge>
              </div>
            </div>

            <div className="mt-4 flex space-x-2">
              <Button className="flex-1 bg-orange-500 hover:bg-orange-600 text-white">
                <Book className="w-4 h-4 mr-1" />
                Build
              </Button>
              <Button variant="outline" size="icon">
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Package Scripts */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Play className="text-github-green mr-2" />
            Available Scripts
          </h3>

          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-medium text-github-green mb-3 flex items-center">
                <Monitor className="w-4 h-4 mr-2" />
                @poc/client
              </h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center">
                  <Badge variant="outline" className="mr-2 text-xs">dev</Badge>
                  Vite development server
                </li>
                <li className="flex items-center">
                  <Badge variant="outline" className="mr-2 text-xs">build</Badge>
                  Production bundle
                </li>
                <li className="flex items-center">
                  <Badge variant="outline" className="mr-2 text-xs">preview</Badge>
                  Preview production build
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-github-purple mb-3 flex items-center">
                <Server className="w-4 h-4 mr-2" />
                @poc/server
              </h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center">
                  <Badge variant="outline" className="mr-2 text-xs">dev</Badge>
                  Nodemon with ts-node
                </li>
                <li className="flex items-center">
                  <Badge variant="outline" className="mr-2 text-xs">build</Badge>
                  TypeScript compile
                </li>
                <li className="flex items-center">
                  <Badge variant="outline" className="mr-2 text-xs">start</Badge>
                  Run production build
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-orange-600 mb-3 flex items-center">
                <Package className="w-4 h-4 mr-2" />
                @poc/core
              </h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center">
                  <Badge variant="outline" className="mr-2 text-xs">dev</Badge>
                  Watch mode compile
                </li>
                <li className="flex items-center">
                  <Badge variant="outline" className="mr-2 text-xs">build</Badge>
                  TypeScript compile
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
