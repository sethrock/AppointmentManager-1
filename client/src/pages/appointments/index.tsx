import { useQuery } from "@tanstack/react-query";
import { Appointment } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import AppointmentList from "@/components/appointment/AppointmentList";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Search, Calendar, Plus } from "lucide-react";

export default function AppointmentsPage() {
  const { data: appointments, isLoading } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments"],
  });
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  
  // Filter appointments based on search term and status
  const filteredAppointments = appointments?.filter(appointment => {
    const matchesSearch = !searchTerm || 
      (appointment.clientName?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (appointment.provider.toLowerCase().includes(searchTerm.toLowerCase()));
      
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "upcoming" && appointment.dispositionStatus !== "Complete" && appointment.dispositionStatus !== "Cancel") ||
      (statusFilter === "completed" && appointment.dispositionStatus === "Complete") ||
      (statusFilter === "canceled" && appointment.dispositionStatus === "Cancel");
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Appointments</h1>
        <Button asChild>
          <Link href="/appointments/new">
            <Plus className="mr-2 h-4 w-4" /> New Appointment
          </Link>
        </Button>
      </div>
      
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search clients or providers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <div className="w-full md:w-64">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <Calendar className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Appointments</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="canceled">Canceled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <AppointmentList 
          appointments={filteredAppointments || []} 
          isLoading={isLoading} 
        />
      </div>
    </div>
  );
}
