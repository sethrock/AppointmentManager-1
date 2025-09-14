import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter } from "lucide-react";

interface ProviderFiltersProps {
  filters: {
    department: string;
    employmentType: string;
    status: string;
  };
  onFiltersChange: (filters: any) => void;
  departments: string[];
}

export default function ProviderFilters({
  filters,
  onFiltersChange,
  departments,
}: ProviderFiltersProps) {
  return (
    <>
      <Select
        value={filters.department}
        onValueChange={(value) =>
          onFiltersChange({ ...filters, department: value })
        }
      >
        <SelectTrigger className="w-[180px]" data-testid="select-department">
          <Filter className="h-4 w-4 mr-2" />
          <SelectValue placeholder="Department" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Departments</SelectItem>
          {departments.map((dept) => (
            <SelectItem key={dept} value={dept}>
              {dept}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.employmentType}
        onValueChange={(value) =>
          onFiltersChange({ ...filters, employmentType: value })
        }
      >
        <SelectTrigger className="w-[180px]" data-testid="select-employment-type">
          <SelectValue placeholder="Employment Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          <SelectItem value="FULL_TIME">Full Time</SelectItem>
          <SelectItem value="PART_TIME">Part Time</SelectItem>
          <SelectItem value="CONTRACTOR">Contractor</SelectItem>
          <SelectItem value="INTERN">Intern</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.status}
        onValueChange={(value) =>
          onFiltersChange({ ...filters, status: value })
        }
      >
        <SelectTrigger className="w-[180px]" data-testid="select-status">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          <SelectItem value="ACTIVE">Active</SelectItem>
          <SelectItem value="ON_LEAVE">On Leave</SelectItem>
          <SelectItem value="TERMINATED">Terminated</SelectItem>
        </SelectContent>
      </Select>
    </>
  );
}