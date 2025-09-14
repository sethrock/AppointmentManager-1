import { Link } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, MapPin, Calendar, Briefcase } from "lucide-react";
import { Provider } from "@shared/schema";
import StatusBadge from "./StatusBadge";

interface ProviderCardProps {
  provider: Provider;
}

export default function ProviderCard({ provider }: ProviderCardProps) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Link href={`/providers/${provider.id}`}>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full" data-testid={`card-provider-${provider.id}`}>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-4">
            {/* Avatar */}
            <Avatar className="h-20 w-20">
              <AvatarImage src={provider.photoUrl || undefined} />
              <AvatarFallback className="text-lg">
                {getInitials(provider.name)}
              </AvatarFallback>
            </Avatar>

            {/* Name and Title */}
            <div>
              <h3 className="font-semibold text-lg">{provider.preferredName || provider.name}</h3>
              <p className="text-sm text-muted-foreground">{provider.jobTitle || "No Title"}</p>
              {provider.department && (
                <p className="text-sm text-muted-foreground">{provider.department}</p>
              )}
            </div>

            {/* Status */}
            <StatusBadge status={provider.status || "ACTIVE"} />

            {/* Contact Info */}
            <div className="w-full space-y-2 text-sm">
              {provider.email && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-3 w-3" />
                  <span className="truncate">{provider.email}</span>
                </div>
              )}
              {provider.phone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  <span>{provider.phone}</span>
                </div>
              )}
              {provider.officeLocation && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span>{provider.officeLocation}</span>
                </div>
              )}
              {provider.employmentType && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Briefcase className="h-3 w-3" />
                  <span>{provider.employmentType.replace("_", " ")}</span>
                </div>
              )}
              {provider.startDate && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>Since {new Date(provider.startDate).getFullYear()}</span>
                </div>
              )}
            </div>

            {/* Tags */}
            {provider.tags && provider.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 justify-center">
                {provider.tags.slice(0, 3).map((tag, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {provider.tags.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{provider.tags.length - 3}
                  </Badge>
                )}
              </div>
            )}

            {/* Archived Badge */}
            {provider.isArchived && (
              <Badge variant="secondary" className="absolute top-2 right-2">
                Archived
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}