import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Upload,
  User,
  Briefcase,
  Shield,
  DollarSign,
  Users,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

const formSchema = z.object({
  // Basic Info
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  preferredName: z.string().optional(),
  email: z.string().email("Invalid email address").optional(),
  phone: z.string().optional(),
  bio: z.string().optional(),
  
  // Employment
  jobTitle: z.string().optional(),
  department: z.string().optional(),
  employmentType: z.enum(["FULL_TIME", "PART_TIME", "CONTRACTOR", "INTERN"]).optional(),
  status: z.enum(["ACTIVE", "ON_LEAVE", "TERMINATED"]).default("ACTIVE"),
  officeLocation: z.string().optional(),
  startDate: z.string().optional(),
  
  // Tags
  tags: z.array(z.string()).default([]),
});

type FormData = z.infer<typeof formSchema>;

const steps = [
  { id: "basic", title: "Basic Info", icon: User },
  { id: "employment", title: "Employment", icon: Briefcase },
  { id: "credentials", title: "Credentials", icon: Shield, optional: true },
  { id: "compensation", title: "Compensation", icon: DollarSign, optional: true },
  { id: "contacts", title: "Contacts", icon: Users, optional: true },
];

export default function NewProviderPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState("");

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      status: "ACTIVE",
      tags: [],
    },
  });

  const createProviderMutation = useMutation({
    mutationFn: async (data: FormData) => {
      // First create the provider
      const providerData = {
        ...data,
        name: `${data.firstName} ${data.lastName}`,
      };
      const provider = await apiRequest("POST", "/api/providers", providerData);
      
      // Then upload photo if provided
      if (photoFile && provider.id) {
        const formData = new FormData();
        formData.append("photo", photoFile);
        
        await fetch(`/api/providers/${provider.id}/photo`, {
          method: "POST",
          body: formData,
          credentials: "include",
        });
      }
      
      return provider;
    },
    onSuccess: (provider) => {
      toast({
        title: "Provider Created",
        description: `${provider.name} has been added to the directory.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/providers"] });
      navigate(`/providers/${provider.id}`);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim()) {
      const currentTags = form.getValues("tags");
      if (!currentTags.includes(tagInput.trim())) {
        form.setValue("tags", [...currentTags, tagInput.trim()]);
      }
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const currentTags = form.getValues("tags");
    form.setValue("tags", currentTags.filter(tag => tag !== tagToRemove));
  };

  const onSubmit = (data: FormData) => {
    createProviderMutation.mutate(data);
  };

  const isStepValid = () => {
    const errors = form.formState.errors;
    
    switch (currentStep) {
      case 0: // Basic Info
        return !errors.firstName && !errors.lastName && !errors.email;
      case 1: // Employment
        return true; // All fields optional
      default:
        return true;
    }
  };

  const handleNext = async () => {
    const isValid = await form.trigger();
    if (isValid && currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    if (currentStep < 2) {
      // Can't skip basic info and employment
      return;
    }
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Submit if on last optional step
      form.handleSubmit(onSubmit)();
    }
  };

  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Button variant="outline" asChild>
          <Link href="/providers">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Directory
          </Link>
        </Button>
      </div>

      {/* Progress */}
      <div className="mb-6">
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between mt-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={step.id}
                className={`flex flex-col items-center ${
                  index <= currentStep ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    index < currentStep
                      ? "bg-primary text-white"
                      : index === currentStep
                      ? "bg-primary/20 text-primary"
                      : "bg-muted"
                  }`}
                >
                  {index < currentStep ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>
                <span className="text-xs mt-1">{step.title}</span>
                {step.optional && (
                  <span className="text-xs text-muted-foreground">(Optional)</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle>{steps[currentStep].title}</CardTitle>
              <CardDescription>
                {currentStep === 0 && "Enter the provider's basic information"}
                {currentStep === 1 && "Configure employment details"}
                {currentStep === 2 && "Add professional credentials (optional)"}
                {currentStep === 3 && "Set up compensation details (optional)"}
                {currentStep === 4 && "Add emergency contacts (optional)"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Step 1: Basic Info */}
              {currentStep === 0 && (
                <>
                  <div className="flex items-center gap-6">
                    <div>
                      <Avatar className="h-24 w-24">
                        <AvatarImage src={photoPreview || undefined} />
                        <AvatarFallback>
                          <User className="h-12 w-12" />
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <div>
                      <input
                        type="file"
                        id="photo-upload"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePhotoChange}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById("photo-upload")?.click()}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Photo
                      </Button>
                      {photoFile && (
                        <p className="text-sm text-muted-foreground mt-1">{photoFile.name}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name *</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-first-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name *</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-last-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="preferredName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preferred Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="How they prefer to be called" />
                        </FormControl>
                        <FormDescription>
                          Leave blank to use first name
                        </FormDescription>
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} data-testid="input-email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="(555) 123-4567" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bio</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Brief description or bio..."
                            rows={3}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </>
              )}

              {/* Step 2: Employment */}
              {currentStep === 1 && (
                <>
                  <FormField
                    control={form.control}
                    name="jobTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Job Title</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Senior Developer" />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Department</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Engineering" />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="employmentType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Employment Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="FULL_TIME">Full Time</SelectItem>
                              <SelectItem value="PART_TIME">Part Time</SelectItem>
                              <SelectItem value="CONTRACTOR">Contractor</SelectItem>
                              <SelectItem value="INTERN">Intern</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="ACTIVE">Active</SelectItem>
                              <SelectItem value="ON_LEAVE">On Leave</SelectItem>
                              <SelectItem value="TERMINATED">Terminated</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="officeLocation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Office Location</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., Building A, Floor 3" />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div>
                    <FormLabel>Tags</FormLabel>
                    <div className="flex gap-2 mt-2">
                      <Input
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        placeholder="Add a tag..."
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddTag();
                          }
                        }}
                      />
                      <Button type="button" onClick={handleAddTag}>
                        Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {form.watch("tags").map((tag) => (
                        <div
                          key={tag}
                          className="px-3 py-1 bg-primary/10 rounded-full text-sm flex items-center gap-2"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Optional Steps Placeholder */}
              {currentStep >= 2 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>This section is optional and can be completed later.</p>
                  <p className="text-sm mt-2">
                    Click "Skip" to continue or "Save" to finish.
                  </p>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 0}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              
              <div className="flex gap-2">
                {currentStep >= 2 && (
                  <Button type="button" variant="outline" onClick={handleSkip}>
                    Skip
                  </Button>
                )}
                
                {currentStep < steps.length - 1 ? (
                  <Button type="button" onClick={handleNext}>
                    Next
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={createProviderMutation.isPending}
                    className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white"
                  >
                    {createProviderMutation.isPending ? "Creating..." : "Create Provider"}
                  </Button>
                )}
              </div>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </div>
  );
}