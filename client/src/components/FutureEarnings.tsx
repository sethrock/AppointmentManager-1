import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  TrendingUp, 
  DollarSign, 
  Calendar, 
  Users, 
  Target, 
  Clock,
  CalendarDays,
  BanknoteIcon,
  Percent
} from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { Appointment } from "@shared/schema";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area
} from "recharts";
import { format, parseISO } from "date-fns";

interface FutureEarningsData {
  timeframe: string;
  summary: {
    projectedRevenue: number;
    expectedDeposits: number;
    netProjectedIncome: number;
    appointmentCount: number;
    averageValue: number;
    confidenceScore: number;
  };
  byProvider: Array<{
    provider: string;
    projectedRevenue: number;
    appointmentCount: number;
    averageValue: number;
  }>;
  byDate: Array<{
    date: string;
    projectedRevenue: number;
    appointmentCount: number;
  }>;
}

interface FutureEarningsProps {
  appointments: Appointment[];
}

export default function FutureEarnings({ appointments }: FutureEarningsProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState("1week");
  const [selectedProvider, setSelectedProvider] = useState<string | undefined>(undefined);
  const [includeRescheduled, setIncludeRescheduled] = useState(true);

  // Get unique providers
  const providers = Array.from(new Set(appointments.map(apt => apt.provider).filter(Boolean))) as string[];

  // Fetch future earnings data
  const { data: earningsData, isLoading } = useQuery<FutureEarningsData>({
    queryKey: ['/api/analytics/future-earnings', selectedTimeframe, selectedProvider, includeRescheduled],
    queryFn: async () => {
      const params = new URLSearchParams({
        timeframe: selectedTimeframe,
        includeRescheduled: includeRescheduled.toString()
      });
      if (selectedProvider) {
        params.append('provider', selectedProvider);
      }
      const response = await fetch(`/api/analytics/future-earnings?${params}`);
      if (!response.ok) throw new Error('Failed to fetch future earnings');
      return response.json();
    }
  });

  const timeframeOptions = [
    { value: "today", label: "Today" },
    { value: "1week", label: "Next 7 Days" },
    { value: "2weeks", label: "Next 14 Days" },
    { value: "3weeks", label: "Next 21 Days" },
    { value: "1month", label: "Next 30 Days" },
    { value: "all", label: "All Future" }
  ];

  if (isLoading || !earningsData) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
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
    );
  }

  const { summary, byProvider, byDate } = earningsData;

  // Transform date data for chart
  const chartData = byDate.map(item => ({
    date: format(parseISO(item.date), 'MMM dd'),
    fullDate: item.date,
    revenue: item.projectedRevenue,
    appointments: item.appointmentCount
  }));

  // Calculate confidence color and label
  const getConfidenceInfo = (score: number) => {
    if (score >= 0.8) return { color: "text-green-600", label: "High", bgColor: "bg-green-100" };
    if (score >= 0.6) return { color: "text-yellow-600", label: "Medium", bgColor: "bg-yellow-100" };
    return { color: "text-red-600", label: "Low", bgColor: "bg-red-100" };
  };

  const confidenceInfo = getConfidenceInfo(summary.confidenceScore);

  return (
    <div className="space-y-6">
      {/* Controls Section */}
      <Card>
        <CardHeader>
          <CardTitle>Future Earnings Analysis</CardTitle>
          <CardDescription>Project revenue based on scheduled appointments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <Label>Time Period</Label>
              <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeframeOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1 min-w-[200px]">
              <Label>Provider Filter</Label>
              <Select value={selectedProvider || "all"} onValueChange={(value) => setSelectedProvider(value === "all" ? undefined : value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Providers</SelectItem>
                  {providers.map(provider => (
                    <SelectItem key={provider} value={provider}>
                      {provider}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="include-rescheduled"
                checked={includeRescheduled}
                onCheckedChange={setIncludeRescheduled}
              />
              <Label htmlFor="include-rescheduled">Include Rescheduled</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projected Revenue</CardTitle>
            <DollarSign className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.projectedRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Gross revenue from {summary.appointmentCount} appointments
            </p>
            <Progress value={100} className="h-2 mt-2" />
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expected Deposits</CardTitle>
            <BanknoteIcon className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.expectedDeposits)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total deposit amount expected
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Projected Income</CardTitle>
            <TrendingUp className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.netProjectedIncome)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              After expected expenses
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confidence Score</CardTitle>
            <Percent className="h-5 w-5" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">{(summary.confidenceScore * 100).toFixed(0)}%</div>
              <Badge className={`${confidenceInfo.bgColor} ${confidenceInfo.color}`}>
                {confidenceInfo.label}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Based on appointment status
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Timeline</CardTitle>
            <CardDescription>Daily projected revenue over selected period</CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                  <Tooltip 
                    formatter={(value, name) => [
                      name === 'revenue' ? formatCurrency(Number(value)) : value,
                      name === 'revenue' ? 'Revenue' : 'Appointments'
                    ]}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#3b82f6" 
                    fill="#3b82f6" 
                    fillOpacity={0.3} 
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No appointments scheduled for this period
              </div>
            )}
          </CardContent>
        </Card>

        {/* Provider Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Provider Revenue Breakdown</CardTitle>
            <CardDescription>Projected revenue by provider</CardDescription>
          </CardHeader>
          <CardContent>
            {byProvider.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={byProvider}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="provider" />
                  <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                  <Tooltip 
                    formatter={(value, name) => [
                      formatCurrency(Number(value)),
                      'Projected Revenue'
                    ]}
                  />
                  <Bar dataKey="projectedRevenue" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No provider data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Appointment Metrics</CardTitle>
          <CardDescription>Key statistics for scheduled appointments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total Appointments</span>
                <span className="text-2xl font-bold">{summary.appointmentCount}</span>
              </div>
              <Progress value={100} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Average Value</span>
                <span className="text-2xl font-bold">{formatCurrency(summary.averageValue)}</span>
              </div>
              <Progress value={75} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Top Provider</span>
                <span className="text-lg font-bold">
                  {byProvider.length > 0 ? byProvider[0].provider : 'N/A'}
                </span>
              </div>
              {byProvider.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(byProvider[0].projectedRevenue)} projected
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}