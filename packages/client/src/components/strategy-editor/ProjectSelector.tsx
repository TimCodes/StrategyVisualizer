import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ChevronDown, Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { LeanProject } from "@shared/schema";
import { DEFAULT_LEAN_TEMPLATE } from "./templates";

interface ProjectSelectorProps {
  currentProject: string | null;
  onSelect: (projectName: string) => void;
}

export function ProjectSelector({
  currentProject,
  onSelect,
}: ProjectSelectorProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const { toast } = useToast();

  const { data: projects = [], isLoading } = useQuery<LeanProject[]>({
    queryKey: ["/api/lean/projects"],
  });

  const createMutation = useMutation({
    mutationFn: (name: string) =>
      apiRequest("POST", "/api/lean/projects", {
        name,
        code: DEFAULT_LEAN_TEMPLATE,
        description: "New LEAN strategy",
        generatedBy: "manual",
      }),
    onSuccess: async (res) => {
      const project = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/lean/projects"] });
      onSelect(project.name);
      setShowCreate(false);
      setNewName("");
      toast({ title: "Project created", description: project.name });
    },
    onError: () => {
      toast({
        title: "Failed to create project",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (name: string) =>
      apiRequest("DELETE", `/api/lean/projects/${name}`),
    onSuccess: (_res, name) => {
      queryClient.invalidateQueries({ queryKey: ["/api/lean/projects"] });
      if (currentProject === name) {
        onSelect(projects.find((p) => p.name !== name)?.name ?? "");
      }
      toast({ title: "Project deleted" });
    },
  });

  const handleCreate = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const safeName = trimmed.replace(/[^a-zA-Z0-9-_]/g, "_");
    createMutation.mutate(safeName);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1 max-w-40">
            <span className="truncate">
              {currentProject ?? "Select project"}
            </span>
            {isLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <ChevronDown className="h-3 w-3 flex-shrink-0" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {projects.map((p) => (
            <DropdownMenuItem
              key={p.id}
              className="flex items-center justify-between group cursor-pointer"
              onClick={() => onSelect(p.name)}
            >
              <span
                className={
                  p.name === currentProject ? "font-semibold text-primary" : ""
                }
              >
                {p.name}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 opacity-0 group-hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteMutation.mutate(p.name);
                }}
              >
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            </DropdownMenuItem>
          ))}
          {projects.length === 0 && !isLoading && (
            <DropdownMenuItem disabled>No projects yet</DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setShowCreate(true)}
            className="gap-2 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            New project
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="proj-name">Project name</Label>
            <Input
              id="proj-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="my-strategy"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Use letters, numbers, hyphens, or underscores.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!newName.trim() || createMutation.isPending}
            >
              {createMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
