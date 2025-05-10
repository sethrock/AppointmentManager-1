import { Appointment } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Phone,
  Mail,
  MapPin,
  Building,
  User,
  Calendar,
  RefreshCw,
  CheckCircle,
  XCircle,
} from "lucide-react";

interface AppointmentDetailProps {
  appointment: Appointment;
  onReschedule?: () => void;
  onComplete?: () => void;
  onCancel?: () => void;
}

export default function AppointmentDetail({ 
  appointment, 
  onReschedule,
  onComplete,
  onCancel
}: AppointmentDetailProps) {
  // Determine if status buttons should be disabled based on current status
  const isCompleted = appointment.dispositionStatus === "Complete";
  const isCanceled = appointment.dispositionStatus === "Cancel";
  const isFinalized = isCompleted || isCanceled;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-medium mb-4">Client Information</h3>
            <div className="space-y-3">
              {appointment.clientName && (
                <div className="flex items-start">
                  <User className="h-5 w-5 mr-2 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">{appointment.clientName}</p>
                  </div>
                </div>
              )}
              
              {appointment.phoneNumber && (
                <div className="flex items-start">
                  <Phone className="h-5 w-5 mr-2 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p>{appointment.phoneNumber}</p>
                  </div>
                </div>
              )}
              
              {appointment.clientEmail && (
                <div className="flex items-start">
                  <Mail className="h-5 w-5 mr-2 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p>{appointment.clientEmail}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-medium mb-4">Appointment Information</h3>
            <div className="space-y-3">
              <div className="flex items-start">
                <Calendar className="h-5 w-5 mr-2 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Date & Time</p>
                  <p className="text-sm text-muted-foreground">
                    {appointment.startDate} at {appointment.startTime}
                    {appointment.endDate && appointment.endTime && ` to ${appointment.endDate} at ${appointment.endTime}`}
                  </p>
                  {appointment.callDuration && (
                    <p className="text-sm text-muted-foreground">
                      Duration: {appointment.callDuration} hours
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex items-start">
                <Building className="h-5 w-5 mr-2 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Call Type</p>
                  <p className="text-sm text-muted-foreground">
                    {appointment.callType === "in-call" ? "In-Call" : "Out-Call"}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="h-5 w-5 mr-2 shrink-0 mt-0.5"></div>
                <div>
                  <p className="font-medium">Status</p>
                  <span className={`px-2 py-1 mt-1 inline-block rounded text-xs font-medium ${
                    appointment.dispositionStatus === "Complete" 
                      ? "status-complete" 
                      : appointment.dispositionStatus === "Cancel"
                        ? "status-cancel"
                        : appointment.dispositionStatus === "Reschedule"
                          ? "status-reschedule"
                          : "status-scheduled"
                  }`}>
                    {appointment.dispositionStatus || "Scheduled"}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {appointment.callType === "out-call" && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-medium mb-4">Location Details</h3>
            <div className="space-y-3">
              {appointment.streetAddress && (
                <div className="flex items-start">
                  <MapPin className="h-5 w-5 mr-2 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">{appointment.streetAddress}</p>
                    {appointment.addressLine2 && (
                      <p>{appointment.addressLine2}</p>
                    )}
                    <p>
                      {appointment.city}, {appointment.state} {appointment.zipCode}
                    </p>
                  </div>
                </div>
              )}
              
              {appointment.outcallDetails && (
                <div className="mt-4">
                  <p className="font-medium">Additional Details</p>
                  <p className="text-sm whitespace-pre-line">{appointment.outcallDetails}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      
      {appointment.dispositionStatus === "Reschedule" && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-medium mb-4">Rescheduled Information</h3>
            <div className="space-y-3">
              <div className="flex items-start">
                <Calendar className="h-5 w-5 mr-2 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Updated Date & Time</p>
                  <p className="text-sm text-muted-foreground">
                    {appointment.updatedStartDate} at {appointment.updatedStartTime}
                    {appointment.updatedEndDate && appointment.updatedEndTime && ` to ${appointment.updatedEndDate} at ${appointment.updatedEndTime}`}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Disposition Status Action Buttons */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-medium mb-4">Update Appointment Status</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={onReschedule} 
              variant="outline" 
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
              disabled={isFinalized}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Reschedule
            </Button>
            <Button 
              onClick={onComplete} 
              variant="default" 
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
              disabled={isFinalized}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Complete
            </Button>
            <Button 
              onClick={onCancel} 
              variant="destructive" 
              className="flex-1 bg-red-500 hover:bg-red-600 text-white"
              disabled={isFinalized}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Cancel
            </Button>
          </div>
          {isFinalized && (
            <p className="text-sm text-muted-foreground mt-3 text-center">
              This appointment has been {isCompleted ? "completed" : "canceled"} and cannot be modified.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
