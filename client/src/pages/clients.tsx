import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Plus, Phone, Mail, DollarSign, Calendar, User, FileDown, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ClientForm from "@/components/clients/ClientForm";
import ClientDetailModal from "@/components/clients/ClientDetailModal";
import type { Client } from "@shared/schema";

export default function ClientsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [marketingFilter, setMarketingFilter] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(0);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const { toast } = useToast();
  
  const pageSize = 20;

  // Fetch clients with filters
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/clients', searchTerm, statusFilter, marketingFilter, currentPage],
    queryFn: () => apiRequest("GET", `/api/clients?search=${searchTerm}&status=${statusFilter}&marketingChannel=${marketingFilter}&limit=${pageSize}&offset=${currentPage * pageSize}`),
  });

  // Export clients mutation
  const exportMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/clients/bulk/export", {
      filters: { search: searchTerm, status: statusFilter, marketingChannel: marketingFilter }
    }),
    onSuccess: (data) => {
      // Create a blob and download
      const blob = new Blob([data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'clients.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Export Successful",
        description: "Client list has been exported to CSV",
      });
    },
    onError: () => {
      toast({
        title: "Export Failed",
        description: "Failed to export client list",
        variant: "destructive",
      });
    },
  });

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(0);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (date: string | Date | null) => {
    if (!date) return "Never";
    return new Date(date).toLocaleDateString();
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "vip":
        return "default";
      case "active":
        return "secondary";
      case "inactive":
        return "outline";
      default:
        return "secondary";
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Clients</h1>
        <div className="flex gap-2">
          <Button
            onClick={() => exportMutation.mutate()}
            variant="outline"
            disabled={exportMutation.isPending}
          >
            <FileDown className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Client
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by name, email, phone, or notes..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value); setCurrentPage(0); }}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="vip">VIP</SelectItem>
              </SelectContent>
            </Select>
            <Select value={marketingFilter} onValueChange={(value) => { setMarketingFilter(value); setCurrentPage(0); }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Channels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Channels</SelectItem>
                <SelectItem value="Website">Website</SelectItem>
                <SelectItem value="Referral">Referral</SelectItem>
                <SelectItem value="Social Media">Social Media</SelectItem>
                <SelectItem value="Walk-in">Walk-in</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data.clients.filter((c: Client) => c.status === 'active').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">VIP Clients</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data.clients.filter((c: Client) => c.status === 'vip').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(data.clients.reduce((sum: number, c: Client) => sum + (c.totalRevenue || 0), 0))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Clients Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Appointments</TableHead>
                <TableHead>Lifetime Value</TableHead>
                <TableHead>Last Visit</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Loading clients...
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-red-500">
                    Error loading clients
                  </TableCell>
                </TableRow>
              ) : !data?.clients?.length ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No clients found
                  </TableCell>
                </TableRow>
              ) : (
                data.clients.map((client: Client) => (
                  <TableRow
                    key={client.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedClient(client)}
                  >
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {client.email && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {client.email}
                          </div>
                        )}
                        {client.phoneNumber && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {client.phoneNumber}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(client.status || 'active')}>
                        {client.status || 'active'}
                      </Badge>
                    </TableCell>
                    <TableCell>{client.appointmentCount || 0}</TableCell>
                    <TableCell>{formatCurrency(client.totalRevenue || 0)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3" />
                        {formatDate(client.lastAppointmentDate)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedClient(client);
                        }}
                      >
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {data && data.total > pageSize && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            disabled={currentPage === 0}
            onClick={() => setCurrentPage(p => p - 1)}
          >
            Previous
          </Button>
          <span className="flex items-center px-4">
            Page {currentPage + 1} of {Math.ceil(data.total / pageSize)}
          </span>
          <Button
            variant="outline"
            disabled={(currentPage + 1) * pageSize >= data.total}
            onClick={() => setCurrentPage(p => p + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {/* Create Client Modal */}
      {isCreateModalOpen && (
        <ClientForm
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            setIsCreateModalOpen(false);
            queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
          }}
        />
      )}

      {/* Client Detail Modal */}
      {selectedClient && (
        <ClientDetailModal
          client={selectedClient}
          onClose={() => setSelectedClient(null)}
          onUpdate={() => {
            queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
          }}
        />
      )}
    </div>
  );
}