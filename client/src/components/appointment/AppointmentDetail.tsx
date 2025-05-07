import { Appointment } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import {
  Phone,
  Mail,
  MapPin,
  Building,
  User,
  Calendar,
} from "lucide-react";

interface AppointmentDetailProps {
  appointment: Appointment;
}

export default function AppointmentDetail({ appointment }: AppointmentDetailProps) {
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
    </div>
  );
}
