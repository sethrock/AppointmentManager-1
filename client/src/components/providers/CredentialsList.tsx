import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Shield, AlertTriangle, Plus, Edit, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

const credentialSchema = z.object({
  licenseNumber: z.string().min(1, "License number is required"),
  licenseType: z.string().min(1, "License type is required"),
  licenseState: z.string().min(1, "State is required"),
  licenseExpiresOn: z.string().optional(),
});

type CredentialFormData = z.infer<typeof credentialSchema>;

interface CredentialsListProps {
  providerId: number;
  credentials: any[];
}

export default function CredentialsList({ providerId, credentials = [] }: CredentialsListProps) {
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [editingCredential, setEditingCredential] = useState<any>(null);

  const form = useForm<CredentialFormData>({
    resolver: zodResolver(credentialSchema),
    defaultValues: {
      licenseNumber: "",
      licenseType: "",
      licenseState: "",
      licenseExpiresOn: "",
    },
  });

  const createCredentialMutation = useMutation({
    mutationFn: (data: CredentialFormData) =>
      apiRequest("POST", `/api/providers/${providerId}/credentials`, data),
    onSuccess: () => {
      toast({
        title: "Credential Added",
        description: "The credential has been added successfully.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/providers/${providerId}/credentials`] });
      setShowDialog(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateCredentialMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: CredentialFormData }) =>
      apiRequest("PUT", `/api/providers/credentials/${id}`, data),
    onSuccess: () => {
      toast({
        title: "Credential Updated",
        description: "The credential has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/providers/${providerId}/credentials`] });
      setShowDialog(false);
      setEditingCredential(null);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteCredentialMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest("DELETE", `/api/providers/credentials/${id}`),
    onSuccess: () => {
      toast({
        title: "Credential Deleted",
        description: "The credential has been removed.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/providers/${providerId}/credentials`] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEdit = (credential: any) => {
    setEditingCredential(credential);
    form.reset({
      licenseNumber: credential.licenseNumber || "",
      licenseType: credential.licenseType || "",
      licenseState: credential.licenseState || "",
      licenseExpiresOn: credential.licenseExpiresOn
        ? new Date(credential.licenseExpiresOn).toISOString().split("T")[0]
        : "",
    });
    setShowDialog(true);
  };

  const handleSubmit = (data: CredentialFormData) => {
    if (editingCredential) {
      updateCredentialMutation.mutate({ id: editingCredential.id, data });
    } else {
      createCredentialMutation.mutate(data);
    }
  };

  const isExpiringSoon = (expiryDate: string) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  };

  const isExpired = (expiryDate: string) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Credentials & Licenses</CardTitle>
              <CardDescription>Professional licenses and certifications</CardDescription>
            </div>
            <Button
              onClick={() => {
                setEditingCredential(null);
                form.reset();
                setShowDialog(true);
              }}
              data-testid="button-add-credential"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Credential
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {credentials.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No credentials on file</p>
            </div>
          ) : (
            <div className="space-y-4">
              {credentials.map((credential) => (
                <div
                  key={credential.id}
                  className="border rounded-lg p-4 space-y-2"
                  data-testid={`credential-${credential.id}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{credential.licenseType}</span>
                        {isExpired(credential.licenseExpiresOn) && (
                          <Badge variant="destructive">Expired</Badge>
                        )}
                        {isExpiringSoon(credential.licenseExpiresOn) && (
                          <Badge variant="outline" className="border-yellow-500 text-yellow-600">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Expiring Soon
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        License #: {credential.licenseNumber}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        State: {credential.licenseState}
                      </div>
                      {credential.licenseExpiresOn && (
                        <div className="text-sm text-muted-foreground">
                          Expires: {new Date(credential.licenseExpiresOn).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(credential)}
                        data-testid={`button-edit-credential-${credential.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteCredentialMutation.mutate(credential.id)}
                        data-testid={`button-delete-credential-${credential.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCredential ? "Edit Credential" : "Add Credential"}
            </DialogTitle>
            <DialogDescription>
              Enter the credential information below.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="licenseType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>License Type *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., Medical License, CPA" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="licenseNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>License Number *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter license number" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="licenseState"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State/Jurisdiction *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., CA, NY" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="licenseExpiresOn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expiration Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowDialog(false);
                    setEditingCredential(null);
                    form.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    createCredentialMutation.isPending ||
                    updateCredentialMutation.isPending
                  }
                >
                  {editingCredential ? "Update" : "Add"} Credential
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}