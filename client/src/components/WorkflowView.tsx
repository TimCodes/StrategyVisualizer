import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Terminal, Workflow, Package, Lightbulb, RefreshCw, Code, Rocket } from "lucide-react";

export default function WorkflowView() {
  return (
    <div className="space-y-8">
      {/* Development Workflow */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-6 flex items-center">
            <Workflow className="text-github-blue mr-2" />
            Development Workflow
          </h3>

          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-github-blue text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">1</div>
                <h4 className="font-medium">Installation</h4>
              </div>
              <div className="ml-11 space-y-3">
                <div className="bg-github-bg rounded-md p-3 font-mono text-sm border border-github-border">
                  <span className="text-gray-500">$</span> npm install
                </div>
                <p className="text-sm text-gray-600">Installs all dependencies across all packages using NPM workspaces</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-github-green text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">2</div>
                <h4 className="font-medium">Development</h4>
              </div>
              <div className="ml-11 space-y-3">
                <div className="bg-github-bg rounded-md p-3 font-mono text-sm border border-github-border">
                  <span className="text-gray-500">$</span> npm run dev
                </div>
                <p className="text-sm text-gray-600">Starts development servers for all packages</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-github-purple text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">3</div>
                <h4 className="font-medium">Build & Deploy</h4>
              </div>
              <div className="ml-11 space-y-3">
                <div className="bg-github-bg rounded-md p-3 font-mono text-sm border border-github-border">
                  <span className="text-gray-500">$</span> npm run build
                </div>
                <p className="text-sm text-gray-600">Builds all packages for production</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Commands Reference */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Terminal className="text-github-green mr-2" />
              Common Commands
            </h3>

            <div className="space-y-4">
              <div>
                <div className="bg-github-bg rounded-md p-3 font-mono text-sm mb-2 border border-github-border">
                  <span className="text-gray-500">$</span> npm run dev --workspace=@poc/client
                </div>
                <p className="text-sm text-gray-600">Start development server for client package only</p>
              </div>

              <div>
                <div className="bg-github-bg rounded-md p-3 font-mono text-sm mb-2 border border-github-border">
                  <span className="text-gray-500">$</span> npm run build --workspace=@poc/core
                </div>
                <p className="text-sm text-gray-600">Build core package for distribution</p>
              </div>

              <div>
                <div className="bg-github-bg rounded-md p-3 font-mono text-sm mb-2 border border-github-border">
                  <span className="text-gray-500">$</span> npm install lodash --workspace=@poc/server
                </div>
                <p className="text-sm text-gray-600">Add dependency to specific package</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Package className="text-github-purple mr-2" />
              Workspace Scripts
            </h3>

            <div className="space-y-3">
              {[
                { script: "npm run dev", desc: "Start all packages in dev mode" },
                { script: "npm run build", desc: "Build all packages" },
                { script: "npm run lint", desc: "Lint all packages" },
                { script: "npm run test", desc: "Run tests across all packages" },
                { script: "npm run clean", desc: "Clean all build artifacts" },
              ].map((item) => (
                <div key={item.script} className="flex items-start gap-3">
                  <Badge variant="secondary" className="font-mono text-xs shrink-0 mt-0.5">{item.script}</Badge>
                  <span className="text-sm text-gray-600">{item.desc}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Architecture Benefits */}
      <Card className="bg-gradient-to-r from-github-bg to-white border border-github-border">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Lightbulb className="text-yellow-500 mr-2" />
            Architecture Benefits
          </h3>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4">
              <RefreshCw className="text-2xl text-github-blue mb-2 mx-auto" size={28} />
              <h4 className="font-medium mb-1">Shared Dependencies</h4>
              <p className="text-sm text-gray-600">Consistent versions across packages</p>
            </div>

            <div className="text-center p-4">
              <Package className="text-2xl text-github-green mb-2 mx-auto" size={28} />
              <h4 className="font-medium mb-1">Package Isolation</h4>
              <p className="text-sm text-gray-600">Independent development and deployment</p>
            </div>

            <div className="text-center p-4">
              <Code className="text-2xl text-github-purple mb-2 mx-auto" size={28} />
              <h4 className="font-medium mb-1">Code Sharing</h4>
              <p className="text-sm text-gray-600">Reusable utilities and types</p>
            </div>

            <div className="text-center p-4">
              <Rocket className="text-2xl text-orange-500 mb-2 mx-auto" size={28} />
              <h4 className="font-medium mb-1">Scalability</h4>
              <p className="text-sm text-gray-600">Easy to add new packages</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
