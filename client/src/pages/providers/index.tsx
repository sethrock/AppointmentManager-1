import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Plus,
  Grid3X3,
  List,
  Filter,
  ArrowUpDown,
  Users,
} from "lucide-react";
import ProviderCard from "@/components/providers/ProviderCard";
import ProviderTable from "@/components/providers/ProviderTable";
import ProviderFilters from "@/components/providers/ProviderFilters";
import { Provider } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export default function ProvidersPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [showArchived, setShowArchived] = useState(false);
  const [filters, setFilters] = useState({
    department: "all",
    employmentType: "all",
    status: "all",
  });
  const [sortBy, setSortBy] = useState("name");
  const [page, setPage] = useState(1);
  const limit = 12;

  // Build query parameters
  const queryParams = new URLSearchParams();
  if (searchTerm) queryParams.append("search", searchTerm);
  if (filters.department !== "all") queryParams.append("department", filters.department);
  if (filters.status !== "all") queryParams.append("status", filters.status);
  queryParams.append("archived", showArchived.toString());
  queryParams.append("limit", limit.toString());
  queryParams.append("offset", ((page - 1) * limit).toString());
  queryParams.append("sortBy", sortBy);
  queryParams.append("sortOrder", "asc");

  const { data, isLoading } = useQuery<{ providers: Provider[]; total: number }>({
    queryKey: ["/api/providers", queryParams.toString()],
    queryFn: async () => {
      const response = await fetch(`/api/providers?${queryParams}`);
      if (!response.ok) throw new Error("Failed to fetch providers");
      return response.json();
    },
  });

  const providers = data?.providers || [];
  const totalPages = Math.ceil((data?.total || 0) / limit);

  // Get unique departments from providers
  const departments = Array.from(
    new Set(providers.map((p) => p.department).filter(Boolean))
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Provider Directory
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your team members and their information
          </p>
        </div>
        <Button asChild className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white">
          <Link href="/providers/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Provider
          </Link>
        </Button>
      </div>

      {/* Search and Controls */}
      <div className="bg-card border rounded-lg p-4 space-y-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, phone, or department..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="pl-10"
              data-testid="input-provider-search"
            />
          </div>

          {/* View Mode Toggle */}
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "grid" | "table")}>
            <TabsList>
              <TabsTrigger value="grid" data-testid="button-view-grid">
                <Grid3X3 className="h-4 w-4 mr-2" />
                Grid
              </TabsTrigger>
              <TabsTrigger value="table" data-testid="button-view-table">
                <List className="h-4 w-4 mr-2" />
                Table
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Sort */}
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[200px]" data-testid="select-sort">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="department">Department</SelectItem>
              <SelectItem value="startDate">Hire Date</SelectItem>
              <SelectItem value="status">Status</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <ProviderFilters
            filters={filters}
            onFiltersChange={setFilters}
            departments={departments}
          />

          {/* Show Archived Toggle */}
          <div className="flex items-center space-x-2">
            <Switch
              id="show-archived"
              checked={showArchived}
              onCheckedChange={setShowArchived}
              data-testid="switch-show-archived"
            />
            <Label htmlFor="show-archived">Show archived</Label>
          </div>

          {/* Active Filters Count */}
          {(searchTerm ||
            filters.department !== "all" ||
            filters.employmentType !== "all" ||
            filters.status !== "all" ||
            showArchived) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm("");
                setFilters({
                  department: "all",
                  employmentType: "all",
                  status: "all",
                });
                setShowArchived(false);
                setPage(1);
              }}
              data-testid="button-clear-filters"
            >
              Clear filters
            </Button>
          )}
        </div>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : providers.length === 0 ? (
        <div className="text-center py-12">
          <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No providers found</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm || filters.department !== "all" || filters.status !== "all"
              ? "Try adjusting your search or filters"
              : "Get started by adding your first provider"}
          </p>
          {!searchTerm && filters.department === "all" && filters.status === "all" && (
            <Button asChild>
              <Link href="/providers/new">
                <Plus className="mr-2 h-4 w-4" />
                Add First Provider
              </Link>
            </Button>
          )}
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {providers.map((provider) => (
            <ProviderCard key={provider.id} provider={provider} />
          ))}
        </div>
      ) : (
        <ProviderTable providers={providers} />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * limit + 1} to{" "}
            {Math.min(page * limit, data?.total || 0)} of {data?.total || 0} providers
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              data-testid="button-prev-page"
            >
              Previous
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = i + 1;
              return (
                <Button
                  key={pageNum}
                  variant={page === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPage(pageNum)}
                  data-testid={`button-page-${pageNum}`}
                >
                  {pageNum}
                </Button>
              );
            })}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages}
              data-testid="button-next-page"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}