import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Users, Calendar, DollarSign, Clock, CheckCircle, MapPin, Target, Award, BarChart3 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { Appointment } from "@shared/schema";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area
} from "recharts";
import { useState, useMemo } from "react";

export default function Analytics() {
  const [dateRange, setDateRange] = useState("all");
  const [selectedMetric, setSelectedMetric] = useState("revenue");
  
  // Fetch appointments data for analytics
  const { data: appointments = [], isLoading } = useQuery<Appointment[]>({
    queryKey: ['/api/appointments'],
  });

  // Data processing and analytics calculations
  const processedData = useMemo(() => {
    if (!appointments.length) return null;

    // Filter data based on date range
    const now = new Date();
    const filteredAppointments = appointments.filter(apt => {
      if (dateRange === "all") return true;
      const aptDate = new Date(apt.startDate);
      switch (dateRange) {
        case "30d":
          return aptDate >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        case "90d":
          return aptDate >= new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        case "1y":
          return aptDate >= new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        default:
          return true;
      }
    });

    // Basic metrics
    const totalAppointments = filteredAppointments.length;
    const completedAppointments = filteredAppointments.filter(apt => apt.dispositionStatus === 'Complete').length;
    const cancelledAppointments = filteredAppointments.filter(apt => apt.dispositionStatus === 'Cancel').length;
    const scheduledAppointments = filteredAppointments.filter(apt => 
      apt.dispositionStatus === 'Reschedule' || !apt.dispositionStatus
    ).length;
    
    const totalRevenue = filteredAppointments
      .filter(apt => apt.dispositionStatus === 'Complete')
      .reduce((sum, apt) => sum + (apt.totalCollected || 0), 0);
    
    const projectedRevenue = filteredAppointments
      .reduce((sum, apt) => sum + (apt.grossRevenue || 0), 0);
    
    const recognizedRevenue = filteredAppointments
      .reduce((sum, apt) => sum + (apt.recognizedRevenue || 0), 0);
    
    const averageAppointmentValue = completedAppointments > 0 ? totalRevenue / completedAppointments : 0;
    const completionRate = totalAppointments > 0 ? (completedAppointments / totalAppointments) * 100 : 0;
    const uniqueClients = new Set(filteredAppointments.map(apt => apt.clientName)).size;

    // Revenue trend data (monthly)
    const revenueByMonth = filteredAppointments.reduce((acc, apt) => {
      if (apt.dispositionStatus === 'Complete') {
        const date = new Date(apt.startDate);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        acc[monthKey] = (acc[monthKey] || 0) + (apt.totalCollected || 0);
      }
      return acc;
    }, {} as Record<string, number>);

    const revenueData = Object.entries(revenueByMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, revenue]) => ({
        month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        revenue,
        appointments: filteredAppointments.filter(apt => {
          const aptMonth = new Date(apt.startDate).toISOString().slice(0, 7);
          return aptMonth === month && apt.dispositionStatus === 'Complete';
        }).length
      }));

    // Provider performance
    const providerStats = filteredAppointments.reduce((acc, apt) => {
      const provider = apt.provider || 'Unknown';
      if (!acc[provider]) {
        acc[provider] = {
          name: provider,
          appointments: 0,
          completed: 0,
          revenue: 0,
          avgDuration: 0,
          totalDuration: 0
        };
      }
      acc[provider].appointments++;
      acc[provider].totalDuration += apt.callDuration || 0;
      if (apt.dispositionStatus === 'Complete') {
        acc[provider].completed++;
        acc[provider].revenue += apt.totalCollected || 0;
      }
      return acc;
    }, {} as Record<string, any>);

    const providerData = Object.values(providerStats).map((provider: any) => ({
      ...provider,
      completionRate: provider.appointments > 0 ? (provider.completed / provider.appointments) * 100 : 0,
      avgDuration: provider.appointments > 0 ? provider.totalDuration / provider.appointments : 0
    }));

    // Marketing channel performance
    const channelStats = filteredAppointments.reduce((acc, apt) => {
      const channel = apt.marketingChannel || 'Unknown';
      if (!acc[channel]) {
        acc[channel] = { name: channel, appointments: 0, revenue: 0, completed: 0 };
      }
      acc[channel].appointments++;
      if (apt.dispositionStatus === 'Complete') {
        acc[channel].completed++;
        acc[channel].revenue += apt.totalCollected || 0;
      }
      return acc;
    }, {} as Record<string, any>);

    const channelData = Object.values(channelStats);

    // Day of week analysis
    const dayStats = filteredAppointments.reduce((acc, apt) => {
      const day = new Date(apt.startDate).toLocaleDateString('en-US', { weekday: 'long' });
      if (!acc[day]) {
        acc[day] = { day, appointments: 0, revenue: 0 };
      }
      acc[day].appointments++;
      if (apt.dispositionStatus === 'Complete') {
        acc[day].revenue += apt.totalCollected || 0;
      }
      return acc;
    }, {} as Record<string, any>);

    const dayData = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
      .map(day => dayStats[day] || { day, appointments: 0, revenue: 0 });

    // Status distribution for pie chart
    const statusData = [
      { name: 'Completed', value: completedAppointments, color: '#10b981' },
      { name: 'Scheduled', value: scheduledAppointments, color: '#3b82f6' },
      { name: 'Cancelled', value: cancelledAppointments, color: '#ef4444' }
    ].filter(item => item.value > 0);

    return {
      metrics: {
        totalAppointments,
        completedAppointments,
        cancelledAppointments,
        scheduledAppointments,
        totalRevenue,
        projectedRevenue,
        recognizedRevenue,
        averageAppointmentValue,
        completionRate,
        uniqueClients
      },
      charts: {
        revenueData,
        providerData,
        channelData,
        dayData,
        statusData
      }
    };
  }, [appointments, dateRange]);

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

  if (!processedData) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium">No data available</p>
              <p className="text-sm text-muted-foreground">Start scheduling appointments to see analytics</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { metrics, charts } = processedData;

  const kpiCards = [
    {
      title: "Total Revenue",
      value: formatCurrency(metrics.totalRevenue),
      description: "Completed appointments",
      icon: DollarSign,
      progress: metrics.projectedRevenue > 0 ? (metrics.totalRevenue / metrics.projectedRevenue) * 100 : 0,
      color: "text-green-600"
    },
    {
      title: "Completion Rate",
      value: `${metrics.completionRate.toFixed(1)}%`,
      description: "Success rate",
      icon: CheckCircle,
      progress: metrics.completionRate,
      color: "text-blue-600"
    },
    {
      title: "Total Appointments",
      value: metrics.totalAppointments.toString(),
      description: "All time bookings",
      icon: Calendar,
      progress: 100,
      color: "text-purple-600"
    },
    {
      title: "Unique Clients",
      value: metrics.uniqueClients.toString(),
      description: "Active client base",
      icon: Users,
      progress: 100,
      color: "text-orange-600"
    }
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header with Controls */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive insights into your appointment performance and business metrics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="1y">Last Year</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiCards.map((kpi, index) => {
          const Icon = kpi.icon;
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
                <Icon className={`h-5 w-5 ${kpi.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpi.value}</div>
                <p className="text-xs text-muted-foreground mb-2">{kpi.description}</p>
                <Progress value={kpi.progress} className="h-2" />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full lg:w-[600px] grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Distribution Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Appointment Status Distribution</CardTitle>
                <CardDescription>Breakdown by completion status</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={charts.statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {charts.statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Weekly Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Weekly Performance</CardTitle>
                <CardDescription>Revenue and appointments by day</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={charts.dayData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip formatter={(value, name) => [
                      name === 'revenue' ? formatCurrency(Number(value)) : value,
                      name === 'revenue' ? 'Revenue' : 'Appointments'
                    ]} />
                    <Bar yAxisId="left" dataKey="revenue" fill="#3b82f6" name="revenue" />
                    <Bar yAxisId="right" dataKey="appointments" fill="#10b981" name="appointments" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            {/* Revenue Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trend</CardTitle>
                <CardDescription>Monthly revenue progression over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={charts.revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(value) => formatCurrency(value)} />
                    <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Revenue']} />
                    <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Revenue Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Collected</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(metrics.totalRevenue)}
                  </div>
                  <p className="text-xs text-muted-foreground">From completed appointments</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Projected Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {formatCurrency(metrics.projectedRevenue)}
                  </div>
                  <p className="text-xs text-muted-foreground">Total potential revenue</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Average Value</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">
                    {formatCurrency(metrics.averageAppointmentValue)}
                  </div>
                  <p className="text-xs text-muted-foreground">Per appointment</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Provider Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Provider Performance</CardTitle>
                <CardDescription>Individual provider metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {charts.providerData.map((provider, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium">{provider.name}</div>
                        <Badge variant="secondary">{provider.appointments} appointments</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Revenue: </span>
                          <span className="font-medium">{formatCurrency(provider.revenue)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Completion: </span>
                          <span className="font-medium">{provider.completionRate.toFixed(1)}%</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Avg Duration: </span>
                          <span className="font-medium">{provider.avgDuration.toFixed(1)}h</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Completed: </span>
                          <span className="font-medium">{provider.completed}</span>
                        </div>
                      </div>
                      <Progress value={provider.completionRate} className="mt-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Marketing Channels */}
            <Card>
              <CardHeader>
                <CardTitle>Marketing Channel Performance</CardTitle>
                <CardDescription>Lead source effectiveness</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={charts.channelData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value, name) => [
                      name === 'revenue' ? formatCurrency(Number(value)) : value,
                      name === 'revenue' ? 'Revenue' : 'Appointments'
                    ]} />
                    <Bar dataKey="appointments" fill="#8884d8" name="appointments" />
                    <Bar dataKey="revenue" fill="#82ca9d" name="revenue" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Performance Goals
                </CardTitle>
                <CardDescription>Track your progress towards targets</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Monthly Revenue Goal</span>
                      <span>{formatCurrency(metrics.totalRevenue)} / {formatCurrency(100000)}</span>
                    </div>
                    <Progress value={(metrics.totalRevenue / 100000) * 100} />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Completion Rate Target</span>
                      <span>{metrics.completionRate.toFixed(1)}% / 85%</span>
                    </div>
                    <Progress value={(metrics.completionRate / 85) * 100} />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Client Base Growth</span>
                      <span>{metrics.uniqueClients} / 50 clients</span>
                    </div>
                    <Progress value={(metrics.uniqueClients / 50) * 100} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Key Achievements
                </CardTitle>
                <CardDescription>Recent milestones and accomplishments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <div className="font-medium text-green-900">Revenue Milestone</div>
                      <div className="text-sm text-green-700">Collected {formatCurrency(metrics.totalRevenue)} total</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                    <Users className="h-5 w-5 text-blue-600" />
                    <div>
                      <div className="font-medium text-blue-900">Client Base</div>
                      <div className="text-sm text-blue-700">Serving {metrics.uniqueClients} unique clients</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                    <Calendar className="h-5 w-5 text-purple-600" />
                    <div>
                      <div className="font-medium text-purple-900">Service Excellence</div>
                      <div className="text-sm text-purple-700">{metrics.completionRate.toFixed(1)}% completion rate</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Actionable Insights */}
          <Card>
            <CardHeader>
              <CardTitle>Actionable Insights & Recommendations</CardTitle>
              <CardDescription>Data-driven suggestions to improve performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg bg-gradient-to-r from-blue-50 to-blue-100">
                  <h4 className="font-medium text-blue-900 mb-2">💡 Revenue Optimization</h4>
                  <p className="text-sm text-blue-800">
                    {metrics.completionRate < 80 
                      ? "Focus on improving completion rate to maximize revenue potential"
                      : "Excellent completion rate! Consider increasing appointment volume"
                    }
                  </p>
                </div>
                <div className="p-4 border rounded-lg bg-gradient-to-r from-green-50 to-green-100">
                  <h4 className="font-medium text-green-900 mb-2">📈 Growth Opportunity</h4>
                  <p className="text-sm text-green-800">
                    {charts.channelData.length > 1 
                      ? "Diversify marketing channels for consistent growth"
                      : "Consider expanding to multiple marketing channels"
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}