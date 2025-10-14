"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, X } from "lucide-react";

interface DocumentSearchProps {
  onSearch: (query: string, fileType?: string) => void;
  onClear: () => void;
}

export function DocumentSearch({ onSearch, onClear }: DocumentSearchProps) {
  const [query, setQuery] = useState("");
  const [fileType, setFileType] = useState<string>("");

  const handleSearch = () => {
    onSearch(query, fileType || undefined);
  };

  const handleClear = () => {
    setQuery("");
    setFileType("");
    onClear();
  };

  return (
    <div className="flex gap-2 items-center">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search documents, folders, tags..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="pl-9"
        />
      </div>

      <Select value={fileType} onValueChange={setFileType}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="All file types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All types</SelectItem>
          <SelectItem value="pdf">PDF</SelectItem>
          <SelectItem value="word">Word</SelectItem>
          <SelectItem value="excel">Excel</SelectItem>
          <SelectItem value="image">Images</SelectItem>
        </SelectContent>
      </Select>

      <Button onClick={handleSearch}>
        Search
      </Button>

      {(query || fileType) && (
        <Button variant="ghost" size="sm" onClick={handleClear}>
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

