import { useState } from "react";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Video } from "lucide-react";

export default function Resources() {
  const [isIframeLoading, setIsIframeLoading] = useState(true);

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
          <TabsTrigger value="video-chat" className="flex items-center gap-2">
            <Video className="h-4 w-4" />
            <span>Video Chat</span>
          </TabsTrigger>
          {/* Additional tabs can be added here in the future */}
        </TabsList>
        
        <TabsContent value="video-chat" className="mt-0">
          <Card className="border-border bg-card/50 backdrop-blur-sm">
            <CardContent className="p-0 relative">
              {isIframeLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 space-y-4">
                  <div className="flex items-center justify-center space-x-2">
                    <Video className="h-8 w-8 text-primary animate-pulse" />
                    <h3 className="text-xl font-semibold">Loading SeraCall...</h3>
                  </div>
                  <Skeleton className="h-80 w-full rounded-lg" />
                </div>
              )}
              <iframe 
                src="https://seracall.replit.app/" 
                title="SeraCall Video Chat"
                className="w-full min-h-[600px] rounded-md border-0"
                onLoad={() => setIsIframeLoading(false)}
                allow="camera; microphone; fullscreen"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}