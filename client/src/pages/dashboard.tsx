import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Appointment } from "@shared/schema";
import { Calendar, Clock, DollarSign, Users, Plus, Search, ArrowUpDown, Filter } from "lucide-react";
import { formatCurrency, formatDate, formatPhoneNumber } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

export default function Dashboard() {
  const { data: appointments, isLoading } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments"],
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortOption, setSortOption] = useState("dateDesc");

  // Filter appointments based on search term and status
  const filteredAppointments = useMemo(() => {
    return appointments?.filter(appointment => {
      // Search matches
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
        (appointment.clientName?.toLowerCase().includes(searchLower)) ||
        (appointment.provider.toLowerCase().includes(searchLower)) ||
        (appointment.phoneNumber?.includes(searchTerm)) || // Exact match for phone digits
        (appointment.phoneNumber && formatPhoneNumber(appointment.phoneNumber).includes(searchTerm)); // Match formatted phone
      
      // Status filter matches  
      const matchesStatus = statusFilter === "all" || 
        (statusFilter === "upcoming" && appointment.dispositionStatus !== "Complete" && appointment.dispositionStatus !== "Cancel") ||
        (statusFilter === "completed" && appointment.dispositionStatus === "Complete") ||
        (statusFilter === "canceled" && appointment.dispositionStatus === "Cancel");
      
      return matchesSearch && matchesStatus;
    });
  }, [appointments, searchTerm, statusFilter]);
  
  // Sort filtered appointments based on sort option
  const sortedAppointments = useMemo(() => {
    if (!filteredAppointments) return [];
    
    return [...filteredAppointments].sort((a, b) => {
      switch (sortOption) {
        case "dateAsc":
          return a.startDate.localeCompare(b.startDate) || 
                 a.startTime.localeCompare(b.startTime);
        case "dateDesc":
          return b.startDate.localeCompare(a.startDate) || 
                 b.startTime.localeCompare(a.startTime);
        case "clientAsc":
          const nameA = a.clientName || "Unnamed";
          const nameB = b.clientName || "Unnamed";
          return nameA.localeCompare(nameB);
        case "clientDesc":
          const nameC = a.clientName || "Unnamed";
          const nameD = b.clientName || "Unnamed";
          return nameD.localeCompare(nameC);
        case "providerAsc":
          return a.provider.localeCompare(b.provider);
        case "providerDesc":
          return b.provider.localeCompare(a.provider);
        case "revenueDesc":
          return (b.grossRevenue || 0) - (a.grossRevenue || 0);
        case "revenueAsc":
          return (a.grossRevenue || 0) - (b.grossRevenue || 0);
        default:
          return 0;
      }
    });
  }, [filteredAppointments, sortOption]);
  
  // Calculate summary stats using filtered appointments
  const stats = useMemo(() => ({
    total: appointments?.length || 0,
    upcoming: appointments?.filter(a => 
      a.dispositionStatus !== "Complete" && 
      a.dispositionStatus !== "Cancel"
    ).length || 0,
    completed: appointments?.filter(a => a.dispositionStatus === "Complete").length || 0,
    revenue: appointments?.reduce((sum, a) => sum + (a.totalCollected || 0) + (a.depositAmount || 0), 0) || 0,
    filtered: filteredAppointments?.length || 0
  }), [appointments, filteredAppointments]);

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview of your appointment system</p>
        </div>
        <Button className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white" asChild>
          <Link href="/appointments/new" className="flex items-center gap-1.5">
            <Plus className="h-4 w-4" />
            New Appointment
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="border-border bg-card/50 backdrop-blur-sm overflow-hidden">
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-20 mb-2" />
                <Skeleton className="h-4 w-40" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <Card className="border-border bg-card/50 backdrop-blur-sm overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Appointments
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="flex items-center">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mr-3">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">All time</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card/50 backdrop-blur-sm overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Upcoming Appointments
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="flex items-center">
                <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center mr-3">
                  <Clock className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.upcoming}</p>
                  <p className="text-xs text-muted-foreground">Scheduled</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card/50 backdrop-blur-sm overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Completed Appointments
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="flex items-center">
                <div className="h-10 w-10 rounded-lg bg-[hsl(150,83%,54%)]/10 flex items-center justify-center mr-3">
                  <Users className="h-5 w-5 text-[hsl(150,83%,54%)]" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.completed}</p>
                  <p className="text-xs text-muted-foreground">Fulfilled</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card/50 backdrop-blur-sm overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Projected Revenue
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="flex items-center">
                <div className="h-10 w-10 rounded-lg bg-[hsl(40,96%,64%)]/10 flex items-center justify-center mr-3">
                  <DollarSign className="h-5 w-5 text-[hsl(40,96%,64%)]" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatCurrency(stats.revenue)}</p>
                  <p className="text-xs text-muted-foreground">All time</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Recent Appointments</h2>
          <div className="hidden sm:flex items-center gap-4">
            <div className="h-0.5 w-12 bg-gradient-to-r from-primary to-accent rounded-full"></div>
            {stats.filtered < stats.total && (
              <p className="text-xs text-muted-foreground">
                Showing {stats.filtered} of {stats.total} appointments
              </p>
            )}
          </div>
        </div>
        
        <div className="search-container-gradient">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search input - Always visible */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-primary/70 h-4 w-4 z-10" />
              <Input
                placeholder="Search clients, providers, or phone numbers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 search-bar-gradient"
                onClick={() => {
                  // For mobile - expand the filter section when search is clicked
                  const filterSection = document.getElementById('dashboard-filter-section');
                  if (filterSection && window.innerWidth < 768) {
                    filterSection.classList.remove('hidden');
                  }
                }}
              />
            </div>
            
            {/* Filter button - Only visible on mobile */}
            <div className="md:hidden flex justify-end">
              <Button 
                variant="outline" 
                size="sm"
                className="ml-2"
                onClick={() => {
                  const filterSection = document.getElementById('dashboard-filter-section');
                  if (filterSection) {
                    filterSection.classList.toggle('hidden');
                  }
                }}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters {(statusFilter !== "all" || sortOption !== "dateDesc") && '•'}
              </Button>
            </div>
            
            {/* Filter section - Always visible on desktop, toggleable on mobile */}
            <div 
              id="dashboard-filter-section" 
              className="hidden md:grid grid-cols-1 sm:grid-cols-2 gap-4 w-full md:w-auto mt-3 md:mt-0"
            >
              <div className="w-full">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <Calendar className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="canceled">Canceled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="w-full">
                <Select value={sortOption} onValueChange={setSortOption}>
                  <SelectTrigger>
                    <ArrowUpDown className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Sort By" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dateDesc">Newest First</SelectItem>
                    <SelectItem value="dateAsc">Oldest First</SelectItem>
                    <SelectItem value="clientAsc">Client (A-Z)</SelectItem>
                    <SelectItem value="clientDesc">Client (Z-A)</SelectItem>
                    <SelectItem value="providerAsc">Provider (A-Z)</SelectItem>
                    <SelectItem value="providerDesc">Provider (Z-A)</SelectItem>
                    <SelectItem value="revenueDesc">Highest Revenue</SelectItem>
                    <SelectItem value="revenueAsc">Lowest Revenue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Active filters summary and clear button - Only shown on mobile when filters are active */}
              {(statusFilter !== "all" || sortOption !== "dateDesc") && (
                <div className="md:hidden col-span-2 flex justify-between items-center pt-2">
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium">Active filters:</span>
                    {statusFilter !== "all" && (
                      <span className="ml-2">Status: {statusFilter}</span>
                    )}
                    {sortOption !== "dateDesc" && (
                      <span className="ml-2">Sort: {
                        sortOption === "dateAsc" ? "Oldest First" :
                        sortOption === "clientAsc" ? "Client (A-Z)" :
                        sortOption === "clientDesc" ? "Client (Z-A)" :
                        sortOption === "providerAsc" ? "Provider (A-Z)" :
                        sortOption === "providerDesc" ? "Provider (Z-A)" :
                        sortOption === "revenueDesc" ? "Highest Revenue" :
                        sortOption === "revenueAsc" ? "Lowest Revenue" : ""
                      }</span>
                    )}
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      setStatusFilter("all");
                      setSortOption("dateDesc");
                    }}
                  >
                    Clear
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="border-border bg-card/50 backdrop-blur-sm overflow-hidden">
                <CardContent className="p-4">
                  <Skeleton className="h-6 w-full mb-2" />
                  <Skeleton className="h-4 w-2/3 mb-2" />
                  <Skeleton className="h-4 w-1/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : sortedAppointments.length > 0 ? (
          <div className="space-y-4">
            {sortedAppointments.slice(0, 5).map((appointment) => (
              <Card key={appointment.id} className="border-border bg-card/50 backdrop-blur-sm overflow-hidden hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                    <h3 className="font-medium text-lg">
                      {appointment.clientName || "Unnamed Client"}
                    </h3>
                    <Badge className={
                      appointment.dispositionStatus === "Complete" 
                        ? "bg-[hsl(150,83%,54%)]/20 text-[hsl(150,83%,54%)] border border-[hsl(150,83%,54%)]/30 hover:bg-[hsl(150,83%,54%)]/30" 
                        : appointment.dispositionStatus === "Cancel"
                          ? "bg-destructive/20 text-destructive border border-destructive/30 hover:bg-destructive/30"
                          : "bg-[hsl(315,90%,67%)]/20 text-[hsl(315,90%,67%)] border border-[hsl(315,90%,67%)]/30 hover:bg-[hsl(315,90%,67%)]/30"
                    }>
                      {appointment.dispositionStatus || "Scheduled"}
                    </Badge>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-muted-foreground mt-1">
                    <span>{formatDate(appointment.startDate)} at {appointment.startTime}</span>
                    <span className="hidden sm:inline">•</span>
                    <span>Provider: {appointment.provider}</span>
                    {appointment.phoneNumber && (
                      <>
                        <span className="hidden sm:inline">•</span>
                        <span>{formatPhoneNumber(appointment.phoneNumber)}</span>
                      </>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mt-4 pt-3 border-t border-border">
                    <span className="text-sm font-medium">
                      Projected Revenue: {formatCurrency(appointment.grossRevenue || 0)}
                    </span>
                    <Button 
                      size="sm"
                      className="bg-primary text-white hover:bg-primary/90 shadow-sm flex items-center gap-1.5" 
                      asChild
                    >
                      <Link href={`/appointments/${appointment.id}`}>
                        <Calendar className="h-3.5 w-3.5" />
                        View Details
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {sortedAppointments.length > 5 && (
              <div className="text-center pt-2">
                <Button variant="outline" asChild>
                  <Link href="/appointments" className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    View All {sortedAppointments.length} Appointments
                  </Link>
                </Button>
              </div>
            )}
          </div>
        ) : (
          <Card className="border-border bg-card/50 backdrop-blur-sm overflow-hidden">
            <CardContent className="p-12 text-center">
              {appointments && appointments.length > 0 ? (
                <>
                  <h3 className="text-lg font-medium mb-2">No appointments match your search</h3>
                  <p className="text-muted-foreground mb-6">Try adjusting your search filters</p>
                  <Button variant="outline" onClick={() => {setSearchTerm(""); setStatusFilter("all"); setSortOption("dateDesc");}}>
                    Clear Filters
                  </Button>
                </>
              ) : (
                <>
                  <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Calendar className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">No appointments yet</h3>
                  <p className="text-muted-foreground mb-6">Get started by creating your first appointment</p>
                  <Button className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white" asChild>
                    <Link href="/appointments/new" className="flex items-center gap-1.5">
                      <Plus className="h-4 w-4" />
                      Create Your First Appointment
                    </Link>
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <div className="flex justify-end">
        <Button 
          className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white shadow" 
          asChild
        >
          <Link href="/appointments" className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            View All Appointments
          </Link>
        </Button>
      </div>
    </div>
  );
}
