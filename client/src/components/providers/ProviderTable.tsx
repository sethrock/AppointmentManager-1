import { Link } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, Edit, Eye } from "lucide-react";
import { Provider } from "@shared/schema";
import StatusBadge from "./StatusBadge";

interface ProviderTableProps {
  providers: Provider[];
}

export default function ProviderTable({ providers }: ProviderTableProps) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Provider</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Start Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {providers.map((provider) => (
            <TableRow key={provider.id} data-testid={`row-provider-${provider.id}`}>
              <TableCell>
                <Link href={`/providers/${provider.id}`}>
                  <div className="flex items-center gap-3 cursor-pointer hover:text-primary">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={provider.photoUrl || undefined} />
                      <AvatarFallback className="text-xs">
                        {getInitials(provider.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{provider.preferredName || provider.name}</p>
                      {provider.isArchived && (
                        <Badge variant="secondary" className="text-xs">
                          Archived
                        </Badge>
                      )}
                    </div>
                  </div>
                </Link>
              </TableCell>
              <TableCell>{provider.jobTitle || "-"}</TableCell>
              <TableCell>{provider.department || "-"}</TableCell>
              <TableCell>
                <div className="space-y-1">
                  {provider.email && (
                    <a
                      href={`mailto:${provider.email}`}
                      className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Mail className="h-3 w-3" />
                      <span className="truncate max-w-[150px]">{provider.email}</span>
                    </a>
                  )}
                  {provider.phone && (
                    <a
                      href={`tel:${provider.phone}`}
                      className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Phone className="h-3 w-3" />
                      <span>{provider.phone}</span>
                    </a>
                  )}
                  {!provider.email && !provider.phone && <span className="text-muted-foreground">-</span>}
                </div>
              </TableCell>
              <TableCell>
                {provider.employmentType ? (
                  <Badge variant="outline">
                    {provider.employmentType.replace("_", " ")}
                  </Badge>
                ) : (
                  "-"
                )}
              </TableCell>
              <TableCell>
                <StatusBadge status={provider.status || "ACTIVE"} />
              </TableCell>
              <TableCell>
                {provider.startDate
                  ? new Date(provider.startDate).toLocaleDateString()
                  : "-"}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/providers/${provider.id}`}>
                      <Eye className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/providers/${provider.id}/edit`}>
                      <Edit className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}