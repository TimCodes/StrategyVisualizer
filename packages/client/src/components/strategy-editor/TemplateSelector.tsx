import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { STRATEGY_TEMPLATES } from "./templates";

interface TemplateSelectorProps {
  onSelect: (code: string) => void;
}

const categories = Array.from(
  new Set(STRATEGY_TEMPLATES.map((t) => t.category))
);

export function TemplateSelector({ onSelect }: TemplateSelectorProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          Templates
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="start">
        {categories.map((cat, i) => (
          <div key={cat}>
            {i > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              {cat}
            </DropdownMenuLabel>
            <DropdownMenuGroup>
              {STRATEGY_TEMPLATES.filter((t) => t.category === cat).map(
                (template) => (
                  <DropdownMenuItem
                    key={template.id}
                    onClick={() => onSelect(template.code)}
                    className="flex flex-col items-start gap-0.5 cursor-pointer"
                  >
                    <span className="font-medium text-sm">{template.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {template.description}
                    </span>
                  </DropdownMenuItem>
                )
              )}
            </DropdownMenuGroup>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
