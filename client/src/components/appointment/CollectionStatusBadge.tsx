import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/format";
import {
  computeAppointmentFinancials,
  getCollectionStatus,
  type FinancialInput,
} from "@/lib/appointmentFinancials";
import { AlertTriangle, TrendingUp, CheckCircle2 } from "lucide-react";

interface CollectionStatusBadgeProps {
  appointment: FinancialInput;
  showAmount?: boolean;
  className?: string;
}

export default function CollectionStatusBadge({
  appointment,
  showAmount = true,
  className,
}: CollectionStatusBadgeProps) {
  const status = getCollectionStatus(appointment);
  const financials = computeAppointmentFinancials(appointment);

  if (status === "none" && appointment.dispositionStatus !== "Complete") {
    return null;
  }

  if (status === "underpayment") {
    return (
      <Badge
        variant="destructive"
        className={className}
      >
        <AlertTriangle className="h-3 w-3 mr-1" />
        Underpayment
        {showAmount && ` — ${formatCurrency(financials.underpaymentAmount)} short`}
      </Badge>
    );
  }

  if (status === "overage") {
    return (
      <Badge
        className={`bg-emerald-600 hover:bg-emerald-600 text-white ${className ?? ""}`}
      >
        <TrendingUp className="h-3 w-3 mr-1" />
        Overage
        {showAmount && ` +${formatCurrency(financials.overageAmount)}`}
      </Badge>
    );
  }

  if (status === "exact") {
    return (
      <Badge
        variant="secondary"
        className={className}
      >
        <CheckCircle2 className="h-3 w-3 mr-1" />
        Paid in full
      </Badge>
    );
  }

  return null;
}