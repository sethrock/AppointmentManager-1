import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Appointment } from "@shared/schema";
import { Calendar, Clock, DollarSign, Users } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function Dashboard() {
  const { data: appointments, isLoading } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments"],
  });

  // Calculate summary stats
  const stats = {
    total: appointments?.length || 0,
    upcoming: appointments?.filter(a => 
      a.dispositionStatus !== "Complete" && 
      a.dispositionStatus !== "Cancel"
    ).length || 0,
    completed: appointments?.filter(a => a.dispositionStatus === "Complete").length || 0,
    revenue: appointments?.reduce((sum, a) => sum + (a.totalCollected || 0), 0) || 0
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <Button asChild>
          <Link href="/appointments/new">
            Create New Appointment
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Appointments
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center">
              <Calendar className="h-5 w-5 text-muted-foreground mr-2" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">All time</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Upcoming Appointments
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center">
              <Clock className="h-5 w-5 text-muted-foreground mr-2" />
              <div>
                <p className="text-2xl font-bold">{stats.upcoming}</p>
                <p className="text-xs text-muted-foreground">Scheduled</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Completed Appointments
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center">
              <Users className="h-5 w-5 text-muted-foreground mr-2" />
              <div>
                <p className="text-2xl font-bold">{stats.completed}</p>
                <p className="text-xs text-muted-foreground">Fulfilled</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Revenue
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center">
              <DollarSign className="h-5 w-5 text-muted-foreground mr-2" />
              <div>
                <p className="text-2xl font-bold">{formatCurrency(stats.revenue)}</p>
                <p className="text-xs text-muted-foreground">All time</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Recent Appointments</h2>
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-6 w-full mb-2" />
                  <Skeleton className="h-4 w-2/3 mb-2" />
                  <Skeleton className="h-4 w-1/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : appointments && appointments.length > 0 ? (
          <div className="space-y-4">
            {appointments.slice(0, 5).map((appointment) => (
              <Card key={appointment.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium">
                      {appointment.clientName || "Unnamed Client"}
                    </h3>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      appointment.dispositionStatus === "Complete" 
                        ? "bg-green-100 text-green-800" 
                        : appointment.dispositionStatus === "Cancel"
                          ? "bg-red-100 text-red-800"
                          : "bg-blue-100 text-blue-800"
                    }`}>
                      {appointment.dispositionStatus || "Scheduled"}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {appointment.startDate} at {appointment.startTime} • Provider: {appointment.provider}
                  </p>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-sm font-medium">
                      {formatCurrency(appointment.grossRevenue || 0)}
                    </span>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/appointments/${appointment.id}`}>
                        View Details
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
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
        )}
      </div>

      <div className="flex justify-end">
        <Button variant="outline" asChild>
          <Link href="/appointments">
            View All Appointments
          </Link>
        </Button>
      </div>
    </div>
  );
}
