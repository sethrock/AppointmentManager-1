import { useState } from "react";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Video, Shield, Building, Copy, ExternalLink, Phone, MessageSquare, Star } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default function Resources() {
  const [isOmniChannelIframeLoading, setIsOmniChannelIframeLoading] = useState(true);
  const [isNumberLookupIframeLoading, setIsNumberLookupIframeLoading] = useState(true);
  const [isVideoIframeLoading, setIsVideoIframeLoading] = useState(true);
  const [isSafetyIframeLoading, setIsSafetyIframeLoading] = useState(true);
  const [isBankingIframeLoading, setIsBankingIframeLoading] = useState(true);
  const { toast } = useToast();

  const resources = [
    { 
      id: "omni-channel-messaging", 
      name: "Omni Channel Messaging", 
      url: "https://omni-channel-messaging.replit.app/", 
      icon: MessageSquare,
      description: "AI-powered communication center with smart replies and analytics",
      category: "Communication",
      important: true
    },
    { 
      id: "number-lookup", 
      name: "Number Lookup", 
      url: "https://numberlookup.replit.app/", 
      icon: Phone,
      description: "Phone number lookup and verification",
      category: "Communication",
      important: false
    },
    { 
      id: "video-chat", 
      name: "Video Chat", 
      url: "https://seracall.replit.app/", 
      icon: Video,
      description: "Secure video chat for appointments",
      category: "Communication",
      important: false
    },
    { 
      id: "safety", 
      name: "Safety", 
      url: "https://sera-safety.replit.app/", 
      icon: Shield,
      description: "Safety resources and information",
      category: "Security",
      important: false
    },
    {
      id: "banking",
      name: "Banking Verification",
      url: "https://banking-verify2view.replit.app/",
      icon: Building,
      description: "Bank routing information verification",
      category: "Financial",
      important: false
    }
  ];

  const copyToClipboard = (url: string, name: string) => {
    navigator.clipboard.writeText(url)
      .then(() => {
        toast({
          title: "URL Copied",
          description: `${name} URL has been copied to clipboard.`,
          duration: 3000
        });
      })
      .catch(() => {
        toast({
          title: "Failed to copy",
          description: "Please try copying manually.",
          variant: "destructive",
          duration: 3000
        });
      });
  };

  // Function to get loading state and setter based on resource ID
  const getLoadingState = (resourceId: string): [boolean, React.Dispatch<React.SetStateAction<boolean>>] => {
    switch (resourceId) {
      case "omni-channel-messaging":
        return [isOmniChannelIframeLoading, setIsOmniChannelIframeLoading];
      case "number-lookup":
        return [isNumberLookupIframeLoading, setIsNumberLookupIframeLoading];
      case "video-chat":
        return [isVideoIframeLoading, setIsVideoIframeLoading];
      case "safety":
        return [isSafetyIframeLoading, setIsSafetyIframeLoading];
      case "banking":
        return [isBankingIframeLoading, setIsBankingIframeLoading];
      default:
        return [true, () => {}];
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Resources
        </h1>
        <p className="text-muted-foreground mt-1">
          Access additional tools and resources to support your appointments
        </p>
      </div>

      <Tabs defaultValue="omni-channel-messaging" className="w-full">
        <TabsList className="mb-4 flex overflow-auto">
          {/* Create tabs dynamically with separators */}
          {resources.reduce((acc: JSX.Element[], resource, index) => {
            // Check if this is a new category that needs a separator
            const prevCategory = index > 0 ? resources[index - 1].category : null;
            const showSeparator = index > 0 && resource.category !== prevCategory;
            
            if (showSeparator) {
              acc.push(
                <div key={`sep-${resource.id}`} className="flex items-center px-1">
                  <div className="h-8 w-0.5 bg-gradient-to-b from-primary/20 to-accent/20 rounded-full"></div>
                </div>
              );
            }
            
            acc.push(
              <TabsTrigger 
                key={resource.id}
                value={resource.id} 
                className={`flex items-center gap-2 ${resource.important ? 'bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20' : ''}`}
              >
                <resource.icon className="h-4 w-4" />
                <span>{resource.name}</span>
                {resource.important && <Star className="h-3 w-3 text-amber-500 fill-amber-500" />}
              </TabsTrigger>
            );
            
            return acc;
          }, [])}
        </TabsList>
        
        {resources.map(resource => {
          const [isLoading, setLoading] = getLoadingState(resource.id);
            
          return (
            <TabsContent key={resource.id} value={resource.id} className="mt-0">
              <Card className="border-border bg-card/50 backdrop-blur-sm">
                <CardContent className="p-0">
                  <div className="flex items-center justify-between p-4 border-b">
                    <div className="flex items-center gap-2">
                      <resource.icon className="h-5 w-5 text-primary" />
                      <h3 className="font-medium">{resource.name}</h3>
                      {resource.important && (
                        <div className="flex items-center gap-1 px-2 py-0.5 text-xs bg-gradient-to-r from-amber-500/10 to-amber-600/10 border border-amber-500/20 text-amber-600 rounded-full">
                          <Star className="h-3 w-3 fill-amber-500" />
                          <span>Featured</span>
                        </div>
                      )}
                      <div className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full ml-2">{resource.category}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1.5"
                        onClick={() => copyToClipboard(resource.url, resource.name)}
                      >
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy URL</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1.5"
                        onClick={() => window.open(resource.url, '_blank')}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>Open in New Tab</span>
                      </Button>
                    </div>
                  </div>
                  <div className="relative">
                    {isLoading && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 space-y-4 z-10">
                        <div className="flex items-center justify-center space-x-2">
                          <resource.icon className="h-8 w-8 text-primary animate-pulse" />
                          <h3 className="text-xl font-semibold">Loading {resource.name}...</h3>
                        </div>
                        <Skeleton className="h-80 w-full rounded-lg" />
                      </div>
                    )}
                    <iframe 
                      src={resource.url} 
                      title={`${resource.name} Resource`}
                      className="w-full min-h-[600px] rounded-b-md border-0"
                      onLoad={() => setLoading(false)}
                      allow="camera; microphone; fullscreen"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}