import { useParams, Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Edit,
  Archive,
  ArchiveRestore,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  Upload,
  FileText,
  Shield,
  DollarSign,
  Users,
  Activity,
  Download,
  Trash2,
} from "lucide-react";
import { Provider } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/format";
import StatusBadge from "@/components/providers/StatusBadge";
import CredentialsList from "@/components/providers/CredentialsList";
import ProviderPhotoUpload from "@/components/providers/ProviderPhotoUpload";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ProviderDetailPage() {
  const params = useParams();
  const id = params.id ? parseInt(params.id) : 0;
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);

  const { data: provider, isLoading } = useQuery<Provider>({
    queryKey: [`/api/providers/${id}`],
    enabled: id > 0,
  });

  const { data: credentials } = useQuery({
    queryKey: [`/api/providers/${id}/credentials`],
    enabled: id > 0,
  });

  const { data: compensation } = useQuery({
    queryKey: [`/api/providers/${id}/compensation/current`],
    enabled: id > 0,
  });

  const { data: contacts } = useQuery({
    queryKey: [`/api/providers/${id}/contacts`],
    enabled: id > 0,
  });

  const { data: documents } = useQuery({
    queryKey: [`/api/providers/${id}/documents`],
    enabled: id > 0,
  });

  const archiveMutation = useMutation({
    mutationFn: async () => {
      const endpoint = provider?.isArchived
        ? `/api/providers/${id}/unarchive`
        : `/api/providers/${id}/archive`;
      return apiRequest("PATCH", endpoint);
    },
    onSuccess: () => {
      toast({
        title: provider?.isArchived ? "Provider Unarchived" : "Provider Archived",
        description: `${provider?.name} has been ${
          provider?.isArchived ? "unarchived" : "archived"
        }.`,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/providers/${id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/providers"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const uploadDocumentMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("document", file);
      formData.append("documentName", file.name);
      formData.append("documentType", file.type);

      const response = await fetch(`/api/providers/${id}/documents`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to upload document");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Document Uploaded",
        description: "The document has been uploaded successfully.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/providers/${id}/documents`] });
    },
    onError: (error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-32 bg-muted rounded"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Provider not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="outline" asChild>
          <Link href="/providers">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Directory
          </Link>
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/providers/${id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </Button>
          <Button
            variant={provider.isArchived ? "default" : "outline"}
            onClick={() => setShowArchiveDialog(true)}
            data-testid="button-archive-provider"
          >
            {provider.isArchived ? (
              <>
                <ArchiveRestore className="mr-2 h-4 w-4" />
                Unarchive
              </>
            ) : (
              <>
                <Archive className="mr-2 h-4 w-4" />
                Archive
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Provider Header Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="relative">
              <Avatar className="h-32 w-32 cursor-pointer" onClick={() => setShowPhotoUpload(true)}>
                <AvatarImage src={provider.photoUrl || undefined} />
                <AvatarFallback className="text-2xl">
                  {getInitials(provider.name)}
                </AvatarFallback>
              </Avatar>
              {showPhotoUpload && (
                <ProviderPhotoUpload
                  providerId={provider.id}
                  currentPhotoUrl={provider.photoUrl}
                  onClose={() => setShowPhotoUpload(false)}
                  onSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: [`/api/providers/${id}`] });
                    setShowPhotoUpload(false);
                  }}
                />
              )}
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h1 className="text-3xl font-bold">{provider.name}</h1>
                  <StatusBadge status={provider.status || "ACTIVE"} />
                  {provider.isArchived && (
                    <Badge variant="secondary">Archived</Badge>
                  )}
                </div>
                <p className="text-lg text-muted-foreground">
                  {provider.jobTitle || "No title"}
                </p>
                {provider.department && (
                  <p className="text-muted-foreground">{provider.department}</p>
                )}
              </div>
              <div className="flex flex-wrap gap-4 text-sm">
                {provider.email && (
                  <div className="flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    <a href={`mailto:${provider.email}`} className="hover:underline">
                      {provider.email}
                    </a>
                  </div>
                )}
                {provider.phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    <a href={`tel:${provider.phone}`} className="hover:underline">
                      {provider.phone}
                    </a>
                  </div>
                )}
                {provider.officeLocation && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    <span>{provider.officeLocation}</span>
                  </div>
                )}
                {provider.startDate && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>Started {new Date(provider.startDate).toLocaleDateString()}</span>
                  </div>
                )}
                {provider.employmentType && (
                  <div className="flex items-center gap-1">
                    <Briefcase className="h-4 w-4" />
                    <span>{provider.employmentType.replace("_", " ")}</span>
                  </div>
                )}
              </div>
              {provider.tags && provider.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {provider.tags.map((tag, index) => (
                    <Badge key={index} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="credentials" data-testid="tab-credentials">
            <Shield className="mr-2 h-4 w-4" />
            Credentials
          </TabsTrigger>
          <TabsTrigger value="compensation" data-testid="tab-compensation">
            <DollarSign className="mr-2 h-4 w-4" />
            Compensation
          </TabsTrigger>
          <TabsTrigger value="contacts" data-testid="tab-contacts">
            <Users className="mr-2 h-4 w-4" />
            Contacts
          </TabsTrigger>
          <TabsTrigger value="documents" data-testid="tab-documents">
            <FileText className="mr-2 h-4 w-4" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="activity" data-testid="tab-activity">
            <Activity className="mr-2 h-4 w-4" />
            Activity
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>About</CardTitle>
            </CardHeader>
            <CardContent>
              {provider.bio ? (
                <p className="whitespace-pre-wrap">{provider.bio}</p>
              ) : (
                <p className="text-muted-foreground">No bio available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Credentials Tab */}
        <TabsContent value="credentials">
          <CredentialsList providerId={provider.id} credentials={credentials} />
        </TabsContent>

        {/* Compensation Tab */}
        <TabsContent value="compensation">
          <Card>
            <CardHeader>
              <CardTitle>Current Compensation</CardTitle>
            </CardHeader>
            <CardContent>
              {compensation ? (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type:</span>
                    <span>{compensation.payType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {compensation.payType === "SALARY" ? "Annual Salary:" : "Hourly Rate:"}
                    </span>
                    <span className="font-semibold">
                      {formatCurrency(compensation.rateOrSalary || 0)}
                      {compensation.payType === "HOURLY" && "/hr"}
                    </span>
                  </div>
                  {compensation.effectiveDate && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Effective Date:</span>
                      <span>{new Date(compensation.effectiveDate).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">No compensation information available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contacts Tab */}
        <TabsContent value="contacts">
          <Card>
            <CardHeader>
              <CardTitle>Emergency Contacts</CardTitle>
            </CardHeader>
            <CardContent>
              {contacts && contacts.length > 0 ? (
                <div className="space-y-4">
                  {contacts.map((contact: any) => (
                    <div key={contact.id} className="border-l-4 border-primary pl-4">
                      <p className="font-semibold">{contact.name}</p>
                      <p className="text-sm text-muted-foreground">{contact.relationship}</p>
                      <div className="flex gap-4 mt-1">
                        {contact.phone && (
                          <a
                            href={`tel:${contact.phone}`}
                            className="text-sm hover:underline flex items-center gap-1"
                          >
                            <Phone className="h-3 w-3" />
                            {contact.phone}
                          </a>
                        )}
                        {contact.email && (
                          <a
                            href={`mailto:${contact.email}`}
                            className="text-sm hover:underline flex items-center gap-1"
                          >
                            <Mail className="h-3 w-3" />
                            {contact.email}
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No emergency contacts on file</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
              <CardDescription>Upload and manage provider documents</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <input
                    type="file"
                    id="document-upload"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        uploadDocumentMutation.mutate(file);
                      }
                    }}
                  />
                  <Button
                    onClick={() => document.getElementById("document-upload")?.click()}
                    disabled={uploadDocumentMutation.isPending}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {uploadDocumentMutation.isPending ? "Uploading..." : "Upload Document"}
                  </Button>
                </div>
                {documents && documents.length > 0 ? (
                  <div className="space-y-2">
                    {documents.map((doc: any) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{doc.documentName}</p>
                            <p className="text-sm text-muted-foreground">
                              Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(doc.filePath, "_blank")}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              try {
                                await apiRequest(
                                  "DELETE",
                                  `/api/providers/${id}/documents/${doc.id}`
                                );
                                queryClient.invalidateQueries({
                                  queryKey: [`/api/providers/${id}/documents`],
                                });
                                toast({
                                  title: "Document Deleted",
                                  description: "The document has been removed.",
                                });
                              } catch (error) {
                                toast({
                                  title: "Error",
                                  description: "Failed to delete document",
                                  variant: "destructive",
                                });
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No documents uploaded</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Activity Log</CardTitle>
              <CardDescription>Recent activity and changes</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Activity tracking coming soon</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Archive Dialog */}
      <AlertDialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {provider.isArchived ? "Unarchive" : "Archive"} Provider?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {provider.isArchived
                ? `This will restore ${provider.name} to active status.`
                : `This will archive ${provider.name}. They will no longer appear in the active directory but their data will be preserved.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => archiveMutation.mutate()}>
              {provider.isArchived ? "Unarchive" : "Archive"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}