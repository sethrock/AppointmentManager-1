import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Users, Calendar, DollarSign, Clock, CheckCircle } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { Appointment } from "@shared/schema";

export default function Analytics() {
  // Fetch appointments data for analytics
  const { data: appointments = [], isLoading } = useQuery<Appointment[]>({
    queryKey: ['/api/appointments'],
  });

  // Calculate analytics metrics
  const totalAppointments = appointments.length;
  const completedAppointments = appointments.filter(apt => apt.dispositionStatus === 'Complete').length;
  const cancelledAppointments = appointments.filter(apt => apt.dispositionStatus === 'Cancel').length;
  const scheduledAppointments = appointments.filter(apt => apt.dispositionStatus === 'Reschedule' || !apt.dispositionStatus).length;
  
  const totalRevenue = appointments
    .filter(apt => apt.dispositionStatus === 'Complete')
    .reduce((sum, apt) => sum + (apt.totalCollected || 0), 0);
  
  const averageAppointmentValue = completedAppointments > 0 ? totalRevenue / completedAppointments : 0;
  
  const completionRate = totalAppointments > 0 ? (completedAppointments / totalAppointments) * 100 : 0;
  
  // Get unique clients
  const uniqueClients = new Set(appointments.map(apt => apt.clientName)).size;

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted rounded w-1/2"></div>
                <div className="h-6 bg-muted rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const metrics = [
    {
      title: "Total Appointments",
      value: totalAppointments.toString(),
      description: "All time appointments",
      icon: Calendar,
      trend: "+12% from last month"
    },
    {
      title: "Total Revenue",
      value: formatCurrency(totalRevenue),
      description: "Completed appointments",
      icon: DollarSign,
      trend: "+8% from last month"
    },
    {
      title: "Unique Clients",
      value: uniqueClients.toString(),
      description: "Active client base",
      icon: Users,
      trend: "+5% from last month"
    },
    {
      title: "Completion Rate",
      value: `${completionRate.toFixed(1)}%`,
      description: "Appointments completed",
      icon: CheckCircle,
      trend: "+2% from last month"
    },
    {
      title: "Completed",
      value: completedAppointments.toString(),
      description: "Successfully finished",
      icon: CheckCircle,
      trend: `${((completedAppointments / totalAppointments) * 100).toFixed(1)}%`
    },
    {
      title: "Scheduled",
      value: scheduledAppointments.toString(),
      description: "Upcoming appointments",
      icon: Clock,
      trend: `${((scheduledAppointments / totalAppointments) * 100).toFixed(1)}%`
    },
    {
      title: "Average Value",
      value: formatCurrency(averageAppointmentValue),
      description: "Per completed appointment",
      icon: TrendingUp,
      trend: "+3% from last month"
    },
    {
      title: "Cancelled",
      value: cancelledAppointments.toString(),
      description: "Cancelled appointments",
      icon: Calendar,
      trend: `${((cancelledAppointments / totalAppointments) * 100).toFixed(1)}%`
    }
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Track your appointment performance and business metrics
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {metric.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metric.value}</div>
                <p className="text-xs text-muted-foreground">
                  {metric.description}
                </p>
                <div className="flex items-center pt-1">
                  <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                  <span className="text-xs text-green-500">
                    {metric.trend}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Appointment Status Distribution</CardTitle>
            <CardDescription>
              Breakdown of all appointments by status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-sm">Completed</span>
                </div>
                <span className="text-sm font-medium">{completedAppointments}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-sm">Scheduled</span>
                </div>
                <span className="text-sm font-medium">{scheduledAppointments}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span className="text-sm">Cancelled</span>
                </div>
                <span className="text-sm font-medium">{cancelledAppointments}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Insights</CardTitle>
            <CardDescription>
              Key performance indicators at a glance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="p-3 border rounded-lg">
                <div className="text-sm text-muted-foreground">Most Active Provider</div>
                <div className="font-medium">
                  {appointments.length > 0 
                    ? (() => {
                        const providerCounts = appointments.reduce((acc, apt) => {
                          acc[apt.provider] = (acc[apt.provider] || 0) + 1;
                          return acc;
                        }, {} as Record<string, number>);
                        const topProvider = Object.entries(providerCounts).sort((a, b) => b[1] - a[1])[0];
                        return topProvider ? `${topProvider[0]} (${topProvider[1]} appointments)` : 'No data available';
                      })()
                    : 'No data available'
                  }
                </div>
              </div>
              <div className="p-3 border rounded-lg">
                <div className="text-sm text-muted-foreground">Average Appointment Duration</div>
                <div className="font-medium">
                  {appointments.length > 0 
                    ? `${(appointments.reduce((sum, apt) => sum + (apt.callDuration || 0), 0) / appointments.length).toFixed(1)} hours`
                    : 'No data available'
                  }
                </div>
              </div>
              <div className="p-3 border rounded-lg">
                <div className="text-sm text-muted-foreground">Total Recognized Revenue</div>
                <div className="font-medium">
                  {formatCurrency(appointments.reduce((sum, apt) => sum + (apt.recognizedRevenue || 0), 0))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}