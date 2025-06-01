import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/format";

export default function ConfirmDepositReturn() {
  const [, setLocation] = useLocation();
  const params = useParams<{ id: string }>();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'already-confirmed'>('loading');
  const [appointment, setAppointment] = useState<any>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const confirmDepositReturn = async () => {
      try {
        const appointmentId = params.id;
        
        if (!appointmentId || isNaN(Number(appointmentId))) {
          setStatus('error');
          setError('Invalid appointment ID');
          return;
        }

        // First get the current appointment to check status
        const appointmentResponse = await apiRequest('GET', `/api/appointments/${appointmentId}`);
        const appointmentData = await appointmentResponse.json();
        
        if (appointmentData.depositReturned) {
          setStatus('already-confirmed');
          setAppointment(appointmentData);
          return;
        }

        // Update the deposit return status
        const response = await apiRequest('PATCH', `/api/appointments/${appointmentId}/confirm-deposit-return`);
        
        if (response.ok) {
          const updatedAppointment = await response.json();
          setAppointment(updatedAppointment);
          setStatus('success');
        } else {
          const errorData = await response.json();
          setStatus('error');
          setError(errorData.message || 'Failed to confirm deposit return');
        }
      } catch (err) {
        setStatus('error');
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      }
    };

    confirmDepositReturn();
  }, [params.id]);

  const handleBackToDashboard = () => {
    setLocation('/dashboard');
  };

  if (status === 'loading') {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Card>
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-lg font-medium">Processing confirmation...</p>
              <p className="text-sm text-muted-foreground">Please wait while we update the deposit return status.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <div>
                <CardTitle className="text-green-800">Deposit Return Confirmed</CardTitle>
                <CardDescription className="text-green-700">
                  The deposit return has been successfully recorded in the system.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-white p-4 rounded-md border border-green-200">
              <h3 className="font-semibold text-green-800 mb-3">Appointment Details</h3>
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">Client:</span> {appointment?.clientName || 'Not specified'}</p>
                <p><span className="font-medium">Phone:</span> {appointment?.phoneNumber || 'Not provided'}</p>
                <p><span className="font-medium">Original Date:</span> {appointment?.startDate}</p>
                <p><span className="font-medium">Cancelled by:</span> {appointment?.whoCanceled === 'client' ? 'Client' : 'Provider'}</p>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-md border border-green-200">
              <h3 className="font-semibold text-green-800 mb-3">Deposit Information</h3>
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">Original Deposit:</span> {formatCurrency(appointment?.depositAmount || 0)}</p>
                <p><span className="font-medium">Amount Returned:</span> {formatCurrency(appointment?.depositReturnAmount || 0)}</p>
                <p className="flex items-center gap-2">
                  <span className="font-medium">Status:</span>
                  <span className="inline-flex items-center gap-1 text-green-600 font-medium">
                    <CheckCircle className="h-4 w-4" />
                    Confirmed Returned
                  </span>
                </p>
              </div>
            </div>

            <div className="pt-4">
              <Button onClick={handleBackToDashboard} className="w-full">
                Return to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'already-confirmed') {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-blue-600" />
              <div>
                <CardTitle className="text-blue-800">Already Confirmed</CardTitle>
                <CardDescription className="text-blue-700">
                  This deposit return has already been confirmed in the system.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-white p-4 rounded-md border border-blue-200">
              <h3 className="font-semibold text-blue-800 mb-3">Appointment Details</h3>
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">Client:</span> {appointment?.clientName || 'Not specified'}</p>
                <p><span className="font-medium">Amount Returned:</span> {formatCurrency(appointment?.depositReturnAmount || 0)}</p>
                <p className="flex items-center gap-2">
                  <span className="font-medium">Status:</span>
                  <span className="inline-flex items-center gap-1 text-blue-600 font-medium">
                    <CheckCircle className="h-4 w-4" />
                    Previously Confirmed
                  </span>
                </p>
              </div>
            </div>

            <div className="pt-4">
              <Button onClick={handleBackToDashboard} className="w-full">
                Return to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-6 w-6 text-red-600" />
            <div>
              <CardTitle className="text-red-800">Error</CardTitle>
              <CardDescription className="text-red-700">
                There was an issue confirming the deposit return.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-white p-4 rounded-md border border-red-200">
            <p className="text-sm text-red-800">{error}</p>
          </div>

          <div className="pt-4">
            <Button onClick={handleBackToDashboard} variant="outline" className="w-full">
              Return to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}