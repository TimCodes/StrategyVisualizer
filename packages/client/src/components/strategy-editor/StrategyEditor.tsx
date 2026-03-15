import { useState, useEffect, useCallback, useRef } from "react";
import Editor, { type Monaco } from "@monaco-editor/react";
import {
  Play,
  Square,
  Save,
  Loader2,
  Sparkles,
  Terminal,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useSocket } from "@/hooks/useSocket";
import { registerLeanCompletions } from "./leanCompletions";
import { TemplateSelector } from "./TemplateSelector";
import { ProjectSelector } from "./ProjectSelector";
import { BacktestResultsPanel } from "./BacktestResultsPanel";
import { StrategyAgent } from "./StrategyAgent";
import { DEFAULT_LEAN_TEMPLATE } from "./templates";
import type { LeanBacktest, LeanProject } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

export function StrategyEditor() {
  const [currentProject, setCurrentProject] = useState<string | null>(null);
  const [code, setCode] = useState(DEFAULT_LEAN_TEMPLATE);
  const [logs, setLogs] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [agentOpen, setAgentOpen] = useState(false);
  const [latestResult, setLatestResult] = useState<LeanBacktest | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const socketRef = useRef<ReturnType<typeof useSocket> | null>(null);
  const { toast } = useToast();

  const socket = useSocket();
  socketRef.current = socket;

  useEffect(() => {
    setWsConnected(socket.isConnected);
  }, [socket.isConnected]);

  const { data: projectData } = useQuery<{ code: string; project: LeanProject }>({
    queryKey: ["/api/lean/projects", currentProject, "code"],
    queryFn: () =>
      fetch(`/api/lean/projects/${currentProject}/code`).then((r) => r.json()),
    enabled: !!currentProject,
  });

  useEffect(() => {
    if (projectData) {
      setCode(projectData.code);
      setIsDirty(false);
    }
  }, [projectData]);

  useEffect(() => {
    const { on, off } = socket;

    on("lean:backtest:log", (line: string) => {
      setLogs((prev) => [...prev, line]);
    });

    on("lean:backtest:complete", (result: LeanBacktest) => {
      setIsRunning(false);
      setLatestResult(result);
      queryClient.invalidateQueries({
        queryKey: ["/api/lean/projects", currentProject, "results"],
      });
      toast({
        title: "Backtest complete",
        description: `Return: ${result.totalReturn >= 0 ? "+" : ""}${result.totalReturn.toFixed(2)}%`,
      });
    });

    on("lean:backtest:error", (error: string) => {
      setIsRunning(false);
      setLogs((prev) => [...prev, `ERROR: ${error}`]);
      toast({ title: "Backtest failed", description: error, variant: "destructive" });
    });

    return () => {
      off("lean:backtest:log");
      off("lean:backtest:complete");
      off("lean:backtest:error");
    };
  }, [socket, currentProject, toast]);

  const handleEditorMount = useCallback(
    (_editor: unknown, monaco: Monaco) => {
      registerLeanCompletions(monaco);
    },
    []
  );

  const handleCodeChange = (val: string | undefined) => {
    setCode(val ?? "");
    setIsDirty(true);
  };

  const handleSave = async () => {
    if (!currentProject) {
      toast({ title: "Select a project first", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      await apiRequest("PUT", `/api/lean/projects/${currentProject}/code`, {
        code,
      });
      setIsDirty(false);
      toast({ title: "Saved" });
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRun = async () => {
    if (!currentProject) {
      toast({ title: "Select a project first", variant: "destructive" });
      return;
    }
    setIsRunning(true);
    setLogs([]);
    setLatestResult(null);

    try {
      const socketId = socket.socket?.id;
      await apiRequest("POST", `/api/lean/projects/${currentProject}/backtest`, {
        code,
        socketId,
      });
    } catch {
      setIsRunning(false);
      toast({ title: "Failed to start backtest", variant: "destructive" });
    }
  };

  const handleProjectSelect = (name: string) => {
    if (isDirty && currentProject) {
      const confirmed = window.confirm(
        "You have unsaved changes. Switch project without saving?"
      );
      if (!confirmed) return;
    }
    setCurrentProject(name);
    setLogs([]);
    setLatestResult(null);
    setIsDirty(false);
  };

  const handleTemplateSelect = (templateCode: string) => {
    setCode(templateCode);
    setIsDirty(true);
  };

  const handleAgentCode = (generatedCode: string) => {
    setCode(generatedCode);
    setIsDirty(true);
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-surface flex-shrink-0 flex-wrap">
        <Button
          onClick={handleRun}
          disabled={isRunning || !currentProject}
          size="sm"
          className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
        >
          {isRunning ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Play className="h-3.5 w-3.5" />
          )}
          {isRunning ? "Running..." : "Run Backtest"}
        </Button>

        {isRunning && (
          <Button
            variant="destructive"
            size="sm"
            className="gap-1.5"
            onClick={() => setIsRunning(false)}
          >
            <Square className="h-3.5 w-3.5" />
            Stop
          </Button>
        )}

        <TemplateSelector onSelect={handleTemplateSelect} />

        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => setAgentOpen(true)}
        >
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          AI Agent
        </Button>

        <div className="h-4 w-px bg-border mx-1" />

        <ProjectSelector
          currentProject={currentProject}
          onSelect={handleProjectSelect}
        />

        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 ml-auto"
          onClick={handleSave}
          disabled={!isDirty || isSaving || !currentProject}
        >
          {isSaving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          Save
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 min-w-0 relative">
          {!currentProject && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm gap-4">
              <Terminal className="h-12 w-12 text-muted-foreground/50" />
              <div className="text-center space-y-2">
                <p className="text-lg font-semibold text-foreground">
                  LEAN Strategy Editor
                </p>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Create or select a project to start writing LEAN Python strategies
                </p>
              </div>
              <ProjectSelector
                currentProject={null}
                onSelect={handleProjectSelect}
              />
            </div>
          )}
          <Editor
            height="100%"
            defaultLanguage="python"
            theme="vs-dark"
            value={code}
            onChange={handleCodeChange}
            onMount={handleEditorMount}
            options={{
              fontSize: 13,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 4,
              insertSpaces: true,
              wordWrap: "off",
              lineNumbers: "on",
              renderLineHighlight: "line",
              suggest: { showSnippets: true },
              quickSuggestions: {
                other: true,
                comments: false,
                strings: false,
              },
              parameterHints: { enabled: true },
              folding: true,
              bracketPairColorization: { enabled: true },
              padding: { top: 8 },
            }}
          />
        </div>

        <div className="w-80 flex-shrink-0 border-l border-border flex flex-col overflow-hidden">
          <BacktestResultsPanel
            projectName={currentProject}
            latestResult={latestResult}
            logs={logs}
            isRunning={isRunning}
          />
        </div>
      </div>

      <div className="flex items-center gap-3 px-3 py-1.5 border-t border-border bg-surface text-xs text-muted-foreground flex-shrink-0">
        <div className="flex items-center gap-1.5">
          {wsConnected ? (
            <CheckCircle2 className="h-3 w-3 text-green-500" />
          ) : (
            <Circle className="h-3 w-3 text-muted-foreground" />
          )}
          <span>{wsConnected ? "Connected" : "Disconnected"}</span>
        </div>

        <div className="h-3 w-px bg-border" />

        <span>
          {currentProject ? (
            <>
              <span className="text-foreground">{currentProject}</span>
              {isDirty && (
                <span className="text-yellow-400 ml-1">• unsaved</span>
              )}
            </>
          ) : (
            "No project"
          )}
        </span>

        <div className="ml-auto flex items-center gap-1.5">
          <span className="text-primary font-medium">LEAN</span>
          <span>Python Engine</span>
          {isRunning && (
            <span className="text-yellow-400 animate-pulse">• Running</span>
          )}
        </div>
      </div>

      <StrategyAgent
        open={agentOpen}
        onClose={() => setAgentOpen(false)}
        onUseCode={handleAgentCode}
        currentCode={currentProject ? code : undefined}
      />
    </div>
  );
}
