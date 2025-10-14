"use client";

import { ChevronRight, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BreadcrumbItem {
  id: string | null;
  name: string;
}

interface BreadcrumbsProps {
  path: BreadcrumbItem[];
  onNavigate: (folderId: string | null) => void;
}

export function Breadcrumbs({ path, onNavigate }: BreadcrumbsProps) {
  return (
    <div className="flex items-center gap-1 text-sm text-muted-foreground">
      <Button
        variant="ghost"
        size="sm"
        className="h-auto p-1"
        onClick={() => onNavigate(null)}
      >
        <Home className="h-4 w-4" />
      </Button>

      {path.map((item, index) => (
        <div key={item.id || "root"} className="flex items-center gap-1">
          <ChevronRight className="h-4 w-4" />
          {index === path.length - 1 ? (
            <span className="font-medium text-foreground">{item.name}</span>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-1 hover:text-foreground"
              onClick={() => onNavigate(item.id)}
            >
              {item.name}
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}

