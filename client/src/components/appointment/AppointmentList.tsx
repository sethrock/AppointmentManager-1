import { Appointment } from "@shared/schema";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Eye, Calendar, Clock, Phone, Mail, MapPin } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
} from "@/components/ui/card";

interface AppointmentListProps {
  appointments: Appointment[];
  isLoading: boolean;
}

export default function AppointmentList({ 
  appointments,
  isLoading,
}: AppointmentListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, index) => (
          <div key={index} className="flex items-center space-x-4 p-4 border rounded-lg">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (appointments.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">No appointments found.</p>
          <Button className="mt-4" asChild>
            <Link href="/appointments/new">
              Create Your First Appointment
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Desktop view - Table
  const desktopView = (
    <div className="hidden md:block rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Client</TableHead>
            <TableHead>Date & Time</TableHead>
            <TableHead>Provider</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Revenue</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {appointments.map((appointment) => (
            <TableRow key={appointment.id}>
              <TableCell className="font-medium">
                {appointment.clientName || "Unnamed Client"}
                <div className="text-xs text-muted-foreground">
                  {appointment.callType === "in-call" ? "In-Call" : "Out-Call"}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1 text-muted-foreground" /> 
                  {appointment.startDate}
                </div>
                <div className="flex items-center mt-1">
                  <Clock className="h-4 w-4 mr-1 text-muted-foreground" /> 
                  {appointment.startTime}
                </div>
              </TableCell>
              <TableCell>{appointment.provider}</TableCell>
              <TableCell>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  appointment.dispositionStatus === "Complete" 
                    ? "bg-emerald-500 text-white dark:bg-emerald-600" 
                    : appointment.dispositionStatus === "Cancel"
                      ? "bg-red-500 text-white dark:bg-red-600"
                      : appointment.dispositionStatus === "Reschedule"
                        ? "bg-amber-500 text-white dark:bg-amber-600"
                        : "bg-blue-500 text-white dark:bg-blue-600"
                }`}>
                  {appointment.dispositionStatus || "Scheduled"}
                </span>
              </TableCell>
              <TableCell>{formatCurrency(appointment.grossRevenue || 0)}</TableCell>
              <TableCell className="text-right">
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/appointments/${appointment.id}`}>
                    <Eye className="h-4 w-4 mr-1" /> View
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
  
  // Mobile view - Cards
  const mobileView = (
    <div className="md:hidden space-y-4">
      {appointments.map((appointment) => (
        <Card key={appointment.id}>
          <CardContent className="p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-medium">{appointment.clientName || "Unnamed Client"}</h3>
                <div className="text-xs text-muted-foreground">
                  Provider: {appointment.provider}
                </div>
              </div>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                appointment.dispositionStatus === "Complete" 
                  ? "bg-emerald-500 text-white dark:bg-emerald-600" 
                  : appointment.dispositionStatus === "Cancel"
                    ? "bg-red-500 text-white dark:bg-red-600"
                    : appointment.dispositionStatus === "Reschedule"
                      ? "bg-amber-500 text-white dark:bg-amber-600"
                      : "bg-blue-500 text-white dark:bg-blue-600"
              }`}>
                {appointment.dispositionStatus || "Scheduled"}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 my-2 text-sm">
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-1 text-muted-foreground" /> 
                {appointment.startDate}
              </div>
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-1 text-muted-foreground" /> 
                {appointment.startTime}
              </div>
              
              {appointment.phoneNumber && (
                <div className="flex items-center col-span-2">
                  <Phone className="h-4 w-4 mr-1 text-muted-foreground" /> 
                  {appointment.phoneNumber}
                </div>
              )}
              
              {appointment.clientEmail && (
                <div className="flex items-center col-span-2">
                  <Mail className="h-4 w-4 mr-1 text-muted-foreground" /> 
                  {appointment.clientEmail}
                </div>
              )}
              
              {appointment.callType === "out-call" && appointment.city && (
                <div className="flex items-center col-span-2">
                  <MapPin className="h-4 w-4 mr-1 text-muted-foreground" /> 
                  {appointment.city}, {appointment.state}
                </div>
              )}
            </div>
            
            <div className="flex justify-between items-center mt-3 pt-3 border-t">
              <div className="font-medium">
                {formatCurrency(appointment.grossRevenue || 0)}
              </div>
              <Button size="sm" variant="outline" asChild>
                <Link href={`/appointments/${appointment.id}`}>
                  <Eye className="h-4 w-4 mr-1" /> Details
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <>
      {desktopView}
      {mobileView}
    </>
  );
}
