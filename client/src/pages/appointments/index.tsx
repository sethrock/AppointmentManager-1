import { useQuery } from "@tanstack/react-query";
import { Appointment } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import AppointmentList from "@/components/appointment/AppointmentList";
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Search, Calendar, Plus, ArrowUpDown, Filter } from "lucide-react";
import { formatPhoneNumber } from "@/lib/format";

export default function AppointmentsPage() {
  const { data: appointments, isLoading } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments"],
  });
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortOption, setSortOption] = useState("dateDesc");
  const [callTypeFilter, setCallTypeFilter] = useState("all");
  
  // Filter appointments based on search term and filters
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
      
      // Call type filter matches
      const matchesCallType = callTypeFilter === "all" ||
        (callTypeFilter === "in-call" && appointment.callType === "in-call") ||
        (callTypeFilter === "out-call" && appointment.callType === "out-call");
      
      return matchesSearch && matchesStatus && matchesCallType;
    });
  }, [appointments, searchTerm, statusFilter, callTypeFilter]);
  
  // Sort filtered appointments based on sort option
  const sortedAppointments = useMemo(() => {
    if (!filteredAppointments) return [];
    
    return [...filteredAppointments].sort((a, b) => {
      switch (sortOption) {
        case "dateAsc":
          // Oldest first (by date then time)
          return a.startDate.localeCompare(b.startDate) || 
                 a.startTime.localeCompare(b.startTime);
        case "dateDesc":
          // Newest first (by date then time)
          return b.startDate.localeCompare(a.startDate) || 
                 b.startTime.localeCompare(a.startTime);
        case "clientAsc":
          // Client name A-Z
          const nameA = a.clientName || "Unnamed";
          const nameB = b.clientName || "Unnamed";
          return nameA.localeCompare(nameB);
        case "clientDesc":
          // Client name Z-A
          const nameC = a.clientName || "Unnamed";
          const nameD = b.clientName || "Unnamed";
          return nameD.localeCompare(nameC);
        case "providerAsc":
          // Provider name A-Z
          return a.provider.localeCompare(b.provider);
        case "providerDesc":
          // Provider name Z-A
          return b.provider.localeCompare(a.provider);
        case "revenueDesc":
          // Highest revenue first
          return (b.grossRevenue || 0) - (a.grossRevenue || 0);
        case "revenueAsc":
          // Lowest revenue first
          return (a.grossRevenue || 0) - (b.grossRevenue || 0);
        default:
          return 0;
      }
    });
  }, [filteredAppointments, sortOption]);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Appointments</h1>
        <Button className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white" asChild>
          <Link href="/appointments/new">
            <Plus className="mr-2 h-4 w-4" /> New Appointment
          </Link>
        </Button>
      </div>
      
      <div className="bg-card text-card-foreground shadow-lg rounded-lg p-6 mb-6 border border-border">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search and filter header */}
          <div className="flex flex-1 items-center">
            {/* Search input - Always visible */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search clients, providers, or phone numbers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                onClick={() => {
                  // For mobile - expand the filter section when search is clicked
                  const filterSection = document.getElementById('appointments-filter-section');
                  if (filterSection && window.innerWidth < 768) {
                    filterSection.classList.remove('hidden');
                  }
                }}
              />
            </div>
            
            {/* Filter buttons - Only visible on mobile */}
            <div className="md:hidden flex">
              <Button 
                variant="outline" 
                size="sm"
                className="ml-2"
                onClick={() => {
                  const filterSection = document.getElementById('appointments-filter-section');
                  if (filterSection) {
                    filterSection.classList.toggle('hidden');
                  }
                }}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters {(statusFilter !== "all" || callTypeFilter !== "all" || sortOption !== "dateDesc") && '•'}
              </Button>
            </div>
          </div>
          
          {/* Filter controls - Always visible on desktop, toggleable on mobile */}
          <div 
            id="appointments-filter-section" 
            className="hidden md:grid grid-cols-1 sm:grid-cols-3 gap-4 w-full md:w-auto mt-3 md:mt-0"
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
              <Select value={callTypeFilter} onValueChange={setCallTypeFilter}>
                <SelectTrigger>
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Call Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Calls</SelectItem>
                  <SelectItem value="in-call">In-Call</SelectItem>
                  <SelectItem value="out-call">Out-Call</SelectItem>
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
            {(statusFilter !== "all" || callTypeFilter !== "all" || sortOption !== "dateDesc") && (
              <div className="md:hidden col-span-3 flex justify-between items-center pt-2 mt-2 border-t border-border/30">
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Active filters:</span>
                  {statusFilter !== "all" && (
                    <span className="ml-1">Status: {statusFilter}</span>
                  )}
                  {callTypeFilter !== "all" && (
                    <span className="ml-1">Call: {callTypeFilter}</span>
                  )}
                  {sortOption !== "dateDesc" && (
                    <span className="ml-1">Sort: {
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
                  variant="outline" 
                  size="sm" 
                  className="text-primary border-primary/30 hover:bg-primary/10"
                  onClick={() => {
                    setStatusFilter("all");
                    setCallTypeFilter("all");
                    setSortOption("dateDesc");
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        </div>
        
        {/* Results count for filtered results */}
        {sortedAppointments.length > 0 && appointments && sortedAppointments.length !== appointments.length && (
          <div className="text-xs font-medium text-primary mt-4 mb-4 p-2 bg-primary/5 border border-primary/10 rounded-md inline-block">
            Showing {sortedAppointments.length} of {appointments.length} appointments
          </div>
        )}
        
        <div className="mt-6">
          <AppointmentList 
            appointments={sortedAppointments} 
            isLoading={isLoading} 
          />
        </div>
      </div>
    </div>
  );
}
