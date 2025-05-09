import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import AppointmentForm from "@/components/appointment/AppointmentForm";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { InsertAppointment } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";

export default function NewAppointment() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const createAppointmentMutation = useMutation({
    mutationFn: async (data: InsertAppointment) => {
      const response = await apiRequest('POST', '/api/appointments', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Appointment created successfully",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      navigate('/appointments');
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create appointment: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (data: InsertAppointment) => {
    createAppointmentMutation.mutate(data);
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <Button variant="outline" asChild className="hover:bg-accent hover:text-accent-foreground transition-colors">
            <Link href="/appointments">
              <span className="mr-2">←</span> Back to Appointments
            </Link>
          </Button>
        </div>
        <h1 className="text-2xl font-semibold text-foreground">New Appointment</h1>
      </div>

      <div className="bg-card text-card-foreground border border-border shadow-lg rounded-lg overflow-hidden">
        <div className="bg-gradient-to-r from-primary to-accent px-6 py-4">
          <h2 className="text-xl font-medium text-primary-foreground">Appointment Details</h2>
          <p className="text-sm text-primary-foreground/80">Create a new appointment by filling out the form below</p>
        </div>

        <AppointmentForm 
          onSubmit={handleSubmit}
          isSubmitting={createAppointmentMutation.isPending}
        />
      </div>
    </div>
  );
}
