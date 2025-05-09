import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Appointment } from "@shared/schema";
import { Calendar, Clock, DollarSign, Users, Plus } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";

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
                Total Revenue
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
          <div className="h-0.5 w-12 bg-gradient-to-r from-primary to-accent rounded-full hidden sm:block"></div>
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
        ) : appointments && appointments.length > 0 ? (
          <div className="space-y-4">
            {appointments.slice(0, 5).map((appointment) => (
              <Card key={appointment.id} className="border-border bg-card/50 backdrop-blur-sm overflow-hidden hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                    <h3 className="font-medium text-lg">
                      {appointment.clientName || "Unnamed Client"}
                    </h3>
                    <Badge className={
                      appointment.dispositionStatus === "Complete" 
                        ? "bg-[hsl(150,83%,54%)]/10 text-[hsl(150,83%,54%)] hover:bg-[hsl(150,83%,54%)]/20" 
                        : appointment.dispositionStatus === "Cancel"
                          ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                          : "bg-primary/10 text-primary hover:bg-primary/20"
                    }>
                      {appointment.dispositionStatus || "Scheduled"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatDate(appointment.startDate)} at {appointment.startTime} • Provider: {appointment.provider}
                  </p>
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mt-4 pt-3 border-t border-border">
                    <span className="text-sm font-medium">
                      Revenue: {formatCurrency(appointment.grossRevenue || 0)}
                    </span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="border-primary/20 text-primary hover:text-primary hover:bg-primary/10" 
                      asChild
                    >
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
          <Card className="border-border bg-card/50 backdrop-blur-sm overflow-hidden">
            <CardContent className="p-12 text-center">
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
            </CardContent>
          </Card>
        )}
      </div>

      <div className="flex justify-end">
        <Button 
          variant="outline" 
          className="border-primary/20 text-primary hover:text-primary hover:bg-primary/10" 
          asChild
        >
          <Link href="/appointments">
            View All Appointments
          </Link>
        </Button>
      </div>
    </div>
  );
}
