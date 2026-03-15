import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Container, Play, Square, RotateCcw, Activity, Network, HardDrive, Cpu, BarChart3, Shield } from "lucide-react";

export default function DockerView() {
  return (
    <div className="space-y-8">
      {/* Docker Architecture Overview */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Container className="text-blue-600 mr-2" />
            Docker Container Architecture
          </h3>
          <p className="text-gray-700 mb-4">
            Complete containerization with Docker Compose orchestration for development and production environments.
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-white rounded-lg border">
              <Container className="text-2xl text-blue-600 mb-2 mx-auto" size={28} />
              <h4 className="font-medium mb-1">4 Services</h4>
              <p className="text-sm text-gray-600">Nginx, Client, Server, Core</p>
            </div>

            <div className="text-center p-4 bg-white rounded-lg border">
              <Network className="text-2xl text-green-600 mb-2 mx-auto" size={28} />
              <h4 className="font-medium mb-1">Service Mesh</h4>
              <p className="text-sm text-gray-600">Internal networking</p>
            </div>

            <div className="text-center p-4 bg-white rounded-lg border">
              <HardDrive className="text-2xl text-purple-600 mb-2 mx-auto" size={28} />
              <h4 className="font-medium mb-1">Shared Volumes</h4>
              <p className="text-sm text-gray-600">Core package distribution</p>
            </div>

            <div className="text-center p-4 bg-white rounded-lg border">
              <Shield className="text-2xl text-orange-600 mb-2 mx-auto" size={28} />
              <h4 className="font-medium mb-1">Security</h4>
              <p className="text-sm text-gray-600">Non-root users, health checks</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Container Status */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Activity className="text-github-green mr-2" />
              Container Status
            </h3>

            <div className="space-y-4">
              {[
                { name: "poc-nginx", status: "Running" },
                { name: "poc-client", status: "Running" },
                { name: "poc-server", status: "Running" },
                { name: "poc-core", status: "Running" },
              ].map((container) => (
                <div
                  key={container.name}
                  className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
                >
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                    <span className="font-medium">{container.name}</span>
                  </div>
                  <Badge className="bg-green-100 text-green-800">{container.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <BarChart3 className="text-github-blue mr-2" />
              Resource Usage
            </h3>

            <div className="space-y-4">
              {[
                { name: "poc-nginx", cpu: "0.1%", memory: "12 MB" },
                { name: "poc-client", cpu: "2.3%", memory: "128 MB" },
                { name: "poc-server", cpu: "1.8%", memory: "96 MB" },
                { name: "poc-core", cpu: "0.0%", memory: "4 MB" },
              ].map((container) => (
                <div key={container.name} className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="font-medium text-sm">{container.name}</span>
                  <div className="flex gap-4 text-sm">
                    <span className="text-gray-500">
                      CPU: <span className="font-mono text-github-text">{container.cpu}</span>
                    </span>
                    <span className="text-gray-500">
                      RAM: <span className="font-mono text-github-text">{container.memory}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Docker Compose Config */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Container className="text-github-blue mr-2" />
            Docker Compose Configuration
          </h3>

          <div className="bg-github-bg border border-github-border rounded-md p-4 font-mono text-sm overflow-x-auto">
            <pre className="text-gray-700 whitespace-pre">{`version: '3.8'
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    depends_on:
      - client
      - server

  client:
    build:
      context: ./packages/client
    volumes:
      - ./packages/client:/app/packages/client
      - /app/packages/client/node_modules
    command: npm run dev --workspace=@poc/client

  server:
    volumes:
      - ./packages/server:/app/packages/server
      - /app/packages/server/node_modules
    command: npm run dev --workspace=@poc/server
    environment:
      - NODE_ENV=development`}</pre>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="bg-gradient-to-r from-github-bg to-white border border-github-border">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Cpu className="text-github-purple mr-2" />
            Container Management
          </h3>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button className="flex-1 bg-github-green hover:bg-github-green/90 text-white">
              <Play className="w-4 h-4 mr-2" />
              Start All
            </Button>

            <Button variant="outline" className="flex-1">
              <Square className="w-4 h-4 mr-2" />
              Stop All
            </Button>

            <Button variant="outline" className="flex-1">
              <RotateCcw className="w-4 h-4 mr-2" />
              Restart
            </Button>

            <Button className="flex-1 bg-github-blue hover:bg-github-blue/90 text-white">
              <Container className="w-4 h-4 mr-2" />
              Rebuild
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
