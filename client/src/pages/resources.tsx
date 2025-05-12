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
import { Video, Shield, Copy, ExternalLink } from "lucide-react";

export default function Resources() {
  const [isVideoIframeLoading, setIsVideoIframeLoading] = useState(true);
  const [isSafetyIframeLoading, setIsSafetyIframeLoading] = useState(true);
  const { toast } = useToast();

  const resources = [
    { 
      id: "video-chat", 
      name: "Video Chat", 
      url: "https://seracall.replit.app/", 
      icon: Video,
      description: "Secure video chat for appointments"
    },
    { 
      id: "safety", 
      name: "Safety", 
      url: "https://sera-safety.replit.app/", 
      icon: Shield,
      description: "Safety resources and information"
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

      <Tabs defaultValue="video-chat" className="w-full">
        <TabsList className="mb-4">
          {resources.map(resource => (
            <TabsTrigger 
              key={resource.id} 
              value={resource.id} 
              className="flex items-center gap-2"
            >
              <resource.icon className="h-4 w-4" />
              <span>{resource.name}</span>
            </TabsTrigger>
          ))}
        </TabsList>
        
        {resources.map(resource => {
          const isLoading = resource.id === "video-chat" 
            ? isVideoIframeLoading 
            : isSafetyIframeLoading;
          const setLoading = resource.id === "video-chat"
            ? setIsVideoIframeLoading
            : setIsSafetyIframeLoading;
            
          return (
            <TabsContent key={resource.id} value={resource.id} className="mt-0">
              <Card className="border-border bg-card/50 backdrop-blur-sm">
                <CardContent className="p-0">
                  <div className="flex items-center justify-between p-4 border-b">
                    <div className="flex items-center gap-2">
                      <resource.icon className="h-5 w-5 text-primary" />
                      <h3 className="font-medium">{resource.name}</h3>
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