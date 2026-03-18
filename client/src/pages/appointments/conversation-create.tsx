import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  MessageSquareText,
  Upload,
  Image,
  FileText,
  X,
  Loader2,
  Sparkles,
  ArrowLeft,
} from "lucide-react";

type UploadedFile = {
  file: File;
  preview?: string;
};

export default function ConversationCreate() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("paste");
  const [pastedText, setPastedText] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploadedImages, setUploadedImages] = useState<UploadedFile[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleFileDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>, type: "file" | "image") => {
      e.preventDefault();
      e.stopPropagation();
      const droppedFiles = Array.from(e.dataTransfer.files);
      addFiles(droppedFiles, type);
    },
    []
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: "file" | "image") => {
    if (e.target.files) {
      addFiles(Array.from(e.target.files), type);
    }
  };

  const addFiles = (files: File[], type: "file" | "image") => {
    const newFiles: UploadedFile[] = files.map((file) => {
      const uf: UploadedFile = { file };
      if (type === "image" && file.type.startsWith("image/")) {
        uf.preview = URL.createObjectURL(file);
      }
      return uf;
    });

    if (type === "file") {
      setUploadedFiles((prev) => [...prev, ...newFiles]);
    } else {
      setUploadedImages((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number, type: "file" | "image") => {
    if (type === "file") {
      setUploadedFiles((prev) => {
        const updated = [...prev];
        updated.splice(index, 1);
        return updated;
      });
    } else {
      setUploadedImages((prev) => {
        const updated = [...prev];
        if (updated[index]?.preview) URL.revokeObjectURL(updated[index].preview!);
        updated.splice(index, 1);
        return updated;
      });
    }
  };

  const hasContent =
    pastedText.trim().length > 0 || uploadedFiles.length > 0 || uploadedImages.length > 0;

  const handleAnalyze = async () => {
    if (!hasContent) {
      toast({
        title: "No content",
        description: "Please paste conversation text or upload files before analyzing.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);

    try {
      const formData = new FormData();

      if (pastedText.trim()) {
        formData.append("text", pastedText);
      }

      for (const uf of uploadedFiles) {
        formData.append("files", uf.file);
      }
      for (const uf of uploadedImages) {
        formData.append("files", uf.file);
      }

      const response = await fetch("/api/conversation/analyze", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        let errorMessage = "Analysis failed";
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          errorMessage = await response.text() || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const extractedData = await response.json();

      sessionStorage.setItem("conversationData", JSON.stringify(extractedData));

      toast({
        title: "Analysis Complete",
        description: "Appointment details extracted successfully. Redirecting to form...",
      });

      navigate("/appointments/new?fromConversation=true");
    } catch (error: any) {
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to analyze conversation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <Button
          variant="outline"
          asChild
          className="hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <Link href="/appointments">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Appointments
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold text-foreground">Conversation Create</h1>
      </div>

      <Card className="border-border bg-card/50 backdrop-blur-sm overflow-hidden">
        <div className="bg-gradient-to-r from-primary to-accent px-6 py-4">
          <h2 className="text-xl font-medium text-primary-foreground flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI-Powered Appointment Creation
          </h2>
          <p className="text-sm text-primary-foreground/80 mt-1">
            Paste or upload a conversation and let AI fill out the appointment form for you.
            You can also rebook an existing client by typing their name and a new date/time.
          </p>
        </div>

        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="paste" className="flex items-center gap-2">
                <MessageSquareText className="h-4 w-4" />
                Paste Text
              </TabsTrigger>
              <TabsTrigger value="file" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Upload File
              </TabsTrigger>
              <TabsTrigger value="screenshot" className="flex items-center gap-2">
                <Image className="h-4 w-4" />
                Upload Screenshot
              </TabsTrigger>
            </TabsList>

            <TabsContent value="paste">
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Paste your SMS, MMS, or chat conversation text below. Include the full
                  conversation for best results.
                </p>
                <Textarea
                  placeholder="Paste your conversation here...&#10;&#10;Example:&#10;Client: Hi, I'd like to book an appointment for Friday at 2pm&#10;Provider: Sure! Would you prefer in-call or out-call?&#10;Client: Out-call please. I'm at the Hilton downtown, room 412...&#10;&#10;— Or rebook an existing client —&#10;Rebook Michael Brandon Ponsoll for Saturday March 22 at 3pm"
                  className="min-h-[300px] font-mono text-sm"
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {pastedText.length > 0
                    ? `${pastedText.split("\n").length} lines pasted`
                    : "No text pasted yet"}
                </p>
              </div>
            </TabsContent>

            <TabsContent value="file">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Upload WhatsApp chat exports (.zip) or CSV spreadsheets of conversations.
                </p>

                <div
                  className="border-2 border-dashed border-border rounded-lg p-10 text-center transition-colors hover:border-primary/50 cursor-pointer"
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => handleFileDrop(e, "file")}
                  onClick={() => document.getElementById("file-input")?.click()}
                >
                  <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                  <p className="text-sm font-medium">
                    Drag & drop files here, or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Supports .zip (WhatsApp exports) and .csv files
                  </p>
                  <input
                    id="file-input"
                    type="file"
                    multiple
                    accept=".zip,.csv"
                    className="hidden"
                    onChange={(e) => handleFileSelect(e, "file")}
                  />
                </div>

                {uploadedFiles.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Uploaded Files:</p>
                    {uploadedFiles.map((uf, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between bg-muted/50 rounded-md px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary" />
                          <span className="text-sm">{uf.file.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({(uf.file.size / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(i, "file");
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="screenshot">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Upload screenshots or photos of conversations. The AI will read the text from
                  the images.
                </p>

                <div
                  className="border-2 border-dashed border-border rounded-lg p-10 text-center transition-colors hover:border-primary/50 cursor-pointer"
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => handleFileDrop(e, "image")}
                  onClick={() => document.getElementById("image-input")?.click()}
                >
                  <Image className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                  <p className="text-sm font-medium">
                    Drag & drop images here, or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Supports PNG, JPG, JPEG, and WebP
                  </p>
                  <input
                    id="image-input"
                    type="file"
                    multiple
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => handleFileSelect(e, "image")}
                  />
                </div>

                {uploadedImages.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Uploaded Images:</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {uploadedImages.map((uf, i) => (
                        <div key={i} className="relative group">
                          {uf.preview ? (
                            <img
                              src={uf.preview}
                              alt={uf.file.name}
                              className="w-full h-32 object-cover rounded-md border border-border"
                            />
                          ) : (
                            <div className="w-full h-32 bg-muted/50 rounded-md border border-border flex items-center justify-center">
                              <Image className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}
                          <Button
                            variant="destructive"
                            size="sm"
                            className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removeFile(i, "image")}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            {uf.file.name}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <div className="mt-8 flex justify-end gap-3">
            <Button variant="outline" asChild>
              <Link href="/appointments">Cancel</Link>
            </Button>
            <Button
              onClick={handleAnalyze}
              disabled={!hasContent || isAnalyzing}
              className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white min-w-[200px]"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing Conversation...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Analyze Conversation
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
