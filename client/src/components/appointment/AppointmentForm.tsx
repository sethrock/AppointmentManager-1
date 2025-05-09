import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertAppointmentSchema } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { Provider } from "@shared/schema";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

// Extend the appointment schema with additional validation
const appointmentFormSchema = insertAppointmentSchema
  .extend({
    // Add any additional client-side validation if needed
  })
  .superRefine((data, ctx) => {
    // Custom validation for interdependent fields
    
    // Validate that if clientUsesEmail is true, clientEmail is provided
    if (data.clientUsesEmail && !data.clientEmail) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Email is required when 'Client Uses Email' is selected",
        path: ["clientEmail"],
      });
    }
    
    // Validate location fields
    if (data.callType === "out-call") {
      if (!data.streetAddress) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Street address is required for out-call",
          path: ["streetAddress"],
        });
      }
      if (!data.city) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "City is required for out-call",
          path: ["city"],
        });
      }
      if (!data.state) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "State is required for out-call",
          path: ["state"],
        });
      }
      if (!data.zipCode) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Zip code is required for out-call",
          path: ["zipCode"],
        });
      }
    }
    
    // Validate financial fields
    if (data.grossRevenue && data.grossRevenue < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Gross revenue cannot be negative",
        path: ["grossRevenue"],
      });
    }
    
    if (data.travelExpense && data.travelExpense < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Travel expense cannot be negative",
        path: ["travelExpense"],
      });
    }
    
    if (data.hostingExpense && data.hostingExpense < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Hosting expense cannot be negative",
        path: ["hostingExpense"],
      });
    }
    
    if (data.depositAmount && data.depositAmount < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Deposit amount cannot be negative",
        path: ["depositAmount"],
      });
    }
    
    // Validate that deposit amount is not greater than gross revenue
    if (data.depositAmount && data.grossRevenue && data.depositAmount > data.grossRevenue) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Deposit amount cannot be greater than gross revenue",
        path: ["depositAmount"],
      });
    }
    
    // Complete status validation
    if (data.dispositionStatus === "Complete") {
      if (data.totalCollectedCash === undefined && data.totalCollectedDigital === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Either cash or digital collection must be provided",
          path: ["totalCollectedCash"],
        });
      }
      
      if (data.seeClientAgain === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Please indicate if you would see this client again",
          path: ["seeClientAgain"],
        });
      }
    }
    
    // Cancel status validation
    if (data.dispositionStatus === "Cancel" && !data.whoCanceled) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please indicate who canceled the appointment",
        path: ["whoCanceled"],
      });
    }
    
    // Reschedule status validation
    if (data.dispositionStatus === "Reschedule") {
      if (!data.updatedStartDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Updated start date is required for reschedule",
          path: ["updatedStartDate"],
        });
      }
      if (!data.updatedStartTime) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Updated start time is required for reschedule",
          path: ["updatedStartTime"],
        });
      }
    }
  });

type AppointmentFormValues = z.infer<typeof appointmentFormSchema>;

interface AppointmentFormProps {
  initialData?: Partial<AppointmentFormValues>;
  onSubmit: (data: AppointmentFormValues) => void;
  isSubmitting?: boolean;
}

export default function AppointmentForm({
  initialData,
  onSubmit,
  isSubmitting = false,
}: AppointmentFormProps) {
  const { data: providers } = useQuery<Provider[]>({
    queryKey: ["/api/providers"],
  });
  
  const [showEmailField, setShowEmailField] = useState(false);
  const [callType, setCallType] = useState<string>("");
  const [hasClientNotes, setHasClientNotes] = useState(false);
  const [dispositionStatus, setDispositionStatus] = useState<string>("");
  
  // Calculate derived fields
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [dueToProvider, setDueToProvider] = useState(0);
  const [totalCollected, setTotalCollected] = useState(0);
  
  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      setBy: "",
      provider: "",
      marketingChannel: "",
      clientName: "",
      phoneNumber: "",
      clientUsesEmail: false,
      clientEmail: "",
      callType: "",
      startDate: "",
      startTime: "",
      ...initialData,
    },
  });
  
  // Derived field calculations
  useEffect(() => {
    const travelExpense = form.watch("travelExpense") || 0;
    const hostingExpense = form.watch("hostingExpense") || 0;
    const calculatedTotalExpenses = travelExpense + hostingExpense;
    setTotalExpenses(calculatedTotalExpenses);
  }, [form.watch("travelExpense"), form.watch("hostingExpense")]);
  
  useEffect(() => {
    const grossRevenue = form.watch("grossRevenue") || 0;
    const depositAmount = form.watch("depositAmount") || 0;
    const calculatedDueToProvider = grossRevenue - depositAmount;
    setDueToProvider(calculatedDueToProvider);
  }, [form.watch("grossRevenue"), form.watch("depositAmount")]);
  
  useEffect(() => {
    const totalCash = form.watch("totalCollectedCash") || 0;
    const totalDigital = form.watch("totalCollectedDigital") || 0;
    const calculatedTotal = totalCash + totalDigital;
    setTotalCollected(calculatedTotal);
  }, [form.watch("totalCollectedCash"), form.watch("totalCollectedDigital")]);
  
  // Watch for form value changes
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "clientUsesEmail") {
        setShowEmailField(!!value.clientUsesEmail);
      }
      if (name === "callType") {
        setCallType(value.callType as string);
      }
      if (name === "hasClientNotes") {
        setHasClientNotes(!!value.hasClientNotes);
      }
      if (name === "dispositionStatus") {
        setDispositionStatus(value.dispositionStatus as string);
      }
    });
    
    // Initialize watched values
    setShowEmailField(!!form.getValues("clientUsesEmail"));
    setCallType(form.getValues("callType") || "");
    setHasClientNotes(!!form.getValues("hasClientNotes"));
    setDispositionStatus(form.getValues("dispositionStatus") || "");
    
    return () => subscription.unsubscribe();
  }, [form.watch]);
  
  const handleCalculateExpenses = () => {
    // Just update the display, the actual calculation happens in useEffect
  };
  
  const handleCalculateDeposit = () => {
    // Just update the display, the actual calculation happens in useEffect
  };
  
  const handleCalculateDue = () => {
    // Just update the display, the actual calculation happens in useEffect
  };
  
  const handleCalculateTotal = () => {
    // Just update the display, the actual calculation happens in useEffect
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="p-6">
        {/* Initial Setup Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <FormField
            control={form.control}
            name="setBy"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-medium required">Set By</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Seth">Seth</SelectItem>
                    <SelectItem value="Sera">Sera</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="provider"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-medium required">Provider</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Sera">Sera</SelectItem>
                    <SelectItem value="Courtesan Couple">Courtesan Couple</SelectItem>
                    <SelectItem value="Chloe">Chloe</SelectItem>
                    <SelectItem value="Alexa">Alexa</SelectItem>
                    <SelectItem value="Frenchie">Frenchie</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="marketingChannel"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-medium required">Marketing Channel</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Private Delights">Private Delights</SelectItem>
                    <SelectItem value="Eros">Eros</SelectItem>
                    <SelectItem value="Tryst">Tryst</SelectItem>
                    <SelectItem value="P411">P411</SelectItem>
                    <SelectItem value="Slixa">Slixa</SelectItem>
                    <SelectItem value="Instagram">Instagram</SelectItem>
                    <SelectItem value="X">X</SelectItem>
                    <SelectItem value="Referral">Referral</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        {/* Client Information Section */}
        <div className="form-section mb-8">
          <h3 className="text-lg font-medium text-foreground mb-4 pb-2 border-b border-border">Client Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            <FormField
              control={form.control}
              name="clientName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input {...field} type="tel" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="clientUsesEmail"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-6">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Client Uses Email</FormLabel>
                  </div>
                </FormItem>
              )}
            />
          </div>
          
          {showEmailField && (
            <div className="mb-6">
              <FormField
                control={form.control}
                name="clientEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}
        </div>
        
        {/* Appointment Location Section */}
        <div className="form-section mb-8">
          <h3 className="text-lg font-medium text-foreground mb-4 pb-2 border-b border-border">Appointment Location</h3>
          
          <div className="mb-6">
            <FormField
              control={form.control}
              name="callType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="required">In or Out Call</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full md:w-1/3">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="in-call">In-Call</SelectItem>
                      <SelectItem value="out-call">Out-Call</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          {/* In-Call Section */}
          {callType === "in-call" && (
            <div className="mb-4">
              <p className="text-sm text-gray-500 italic">Using default in-call location.</p>
            </div>
          )}
          
          {/* Out-Call Section */}
          {callType === "out-call" && (
            <>
              <div className="grid grid-cols-1 gap-6 mb-6">
                <FormField
                  control={form.control}
                  name="streetAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Street Address</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="addressLine2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address Line 2</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-6">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="AL">Alabama</SelectItem>
                          <SelectItem value="AK">Alaska</SelectItem>
                          <SelectItem value="AZ">Arizona</SelectItem>
                          <SelectItem value="AR">Arkansas</SelectItem>
                          <SelectItem value="CA">California</SelectItem>
                          <SelectItem value="CO">Colorado</SelectItem>
                          <SelectItem value="CT">Connecticut</SelectItem>
                          <SelectItem value="DE">Delaware</SelectItem>
                          <SelectItem value="FL">Florida</SelectItem>
                          <SelectItem value="GA">Georgia</SelectItem>
                          <SelectItem value="HI">Hawaii</SelectItem>
                          <SelectItem value="ID">Idaho</SelectItem>
                          <SelectItem value="IL">Illinois</SelectItem>
                          <SelectItem value="IN">Indiana</SelectItem>
                          <SelectItem value="IA">Iowa</SelectItem>
                          <SelectItem value="KS">Kansas</SelectItem>
                          <SelectItem value="KY">Kentucky</SelectItem>
                          <SelectItem value="LA">Louisiana</SelectItem>
                          <SelectItem value="ME">Maine</SelectItem>
                          <SelectItem value="MD">Maryland</SelectItem>
                          <SelectItem value="MA">Massachusetts</SelectItem>
                          <SelectItem value="MI">Michigan</SelectItem>
                          <SelectItem value="MN">Minnesota</SelectItem>
                          <SelectItem value="MS">Mississippi</SelectItem>
                          <SelectItem value="MO">Missouri</SelectItem>
                          <SelectItem value="MT">Montana</SelectItem>
                          <SelectItem value="NE">Nebraska</SelectItem>
                          <SelectItem value="NV">Nevada</SelectItem>
                          <SelectItem value="NH">New Hampshire</SelectItem>
                          <SelectItem value="NJ">New Jersey</SelectItem>
                          <SelectItem value="NM">New Mexico</SelectItem>
                          <SelectItem value="NY">New York</SelectItem>
                          <SelectItem value="NC">North Carolina</SelectItem>
                          <SelectItem value="ND">North Dakota</SelectItem>
                          <SelectItem value="OH">Ohio</SelectItem>
                          <SelectItem value="OK">Oklahoma</SelectItem>
                          <SelectItem value="OR">Oregon</SelectItem>
                          <SelectItem value="PA">Pennsylvania</SelectItem>
                          <SelectItem value="RI">Rhode Island</SelectItem>
                          <SelectItem value="SC">South Carolina</SelectItem>
                          <SelectItem value="SD">South Dakota</SelectItem>
                          <SelectItem value="TN">Tennessee</SelectItem>
                          <SelectItem value="TX">Texas</SelectItem>
                          <SelectItem value="UT">Utah</SelectItem>
                          <SelectItem value="VT">Vermont</SelectItem>
                          <SelectItem value="VA">Virginia</SelectItem>
                          <SelectItem value="WA">Washington</SelectItem>
                          <SelectItem value="WV">West Virginia</SelectItem>
                          <SelectItem value="WI">Wisconsin</SelectItem>
                          <SelectItem value="WY">Wyoming</SelectItem>
                          <SelectItem value="DC">Washington DC</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="zipCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Zip Code</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="mb-6">
                <FormField
                  control={form.control}
                  name="outcallDetails"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Outcall Details</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </>
          )}
        </div>
        
        {/* Appointment Date/Time Section */}
        <div className="form-section mb-8">
          <h3 className="text-lg font-medium text-foreground mb-4 pb-2 border-b border-border">Appointment Date/Time</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="required">Appointment Start Date</FormLabel>
                  <FormControl>
                    <Input {...field} type="date" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="startTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="required">Appointment Start Time</FormLabel>
                  <FormControl>
                    <Input {...field} type="time" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Appointment End Date</FormLabel>
                  <FormControl>
                    <Input {...field} type="date" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="endTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Appointment End Time</FormLabel>
                  <FormControl>
                    <Input {...field} type="time" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div className="mb-6">
            <FormField
              control={form.control}
              name="callDuration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Call Duration</FormLabel>
                  <Select 
                    onValueChange={(val) => field.onChange(parseFloat(val))} 
                    value={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full md:w-1/3">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="1">1 hour</SelectItem>
                      <SelectItem value="1.5">1.5 hours</SelectItem>
                      <SelectItem value="2">2 hours</SelectItem>
                      <SelectItem value="2.5">2.5 hours</SelectItem>
                      <SelectItem value="3">3 hours</SelectItem>
                      <SelectItem value="3.5">3.5 hours</SelectItem>
                      <SelectItem value="4">4 hours</SelectItem>
                      <SelectItem value="4.5">4.5 hours</SelectItem>
                      <SelectItem value="5">5 hours</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
        
        {/* Appointment Financials Section */}
        <div className="form-section mb-8">
          <h3 className="text-lg font-medium text-foreground mb-4 pb-2 border-b border-border">Appointment Financials</h3>
          
          <h4 className="font-medium text-foreground/90 mb-3">Gross Income</h4>
          <div className="mb-6">
            <FormField
              control={form.control}
              name="grossRevenue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="required">Gross Revenue</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <span className="text-gray-500">$</span>
                      </div>
                      <Input 
                        {...field}
                        type="number"
                        step="0.01"
                        min="0"
                        className="pl-7"
                        onChange={(e) => {
                          const value = e.target.value === "" ? undefined : parseFloat(e.target.value);
                          field.onChange(value);
                        }}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <h4 className="font-medium text-foreground/90 mb-3">Expenses</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <FormField
              control={form.control}
              name="travelExpense"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Travel</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <span className="text-gray-500">$</span>
                      </div>
                      <Input 
                        {...field}
                        type="number"
                        step="0.01"
                        min="0"
                        className="pl-7"
                        onChange={(e) => {
                          const value = e.target.value === "" ? undefined : parseFloat(e.target.value);
                          field.onChange(value);
                        }}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="hostingExpense"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hosting Expense</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <span className="text-gray-500">$</span>
                      </div>
                      <Input 
                        {...field}
                        type="number"
                        step="0.01"
                        min="0"
                        className="pl-7"
                        onChange={(e) => {
                          const value = e.target.value === "" ? undefined : parseFloat(e.target.value);
                          field.onChange(value);
                        }}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div className="mb-6">
            <FormField
              control={form.control}
              name="inOutGoesTo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>IN/OUT Goes to</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex space-x-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="agency" id="agency" />
                        <Label htmlFor="agency">Agency</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="provider" id="provider" />
                        <Label htmlFor="provider">Provider</Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div className="mb-6">
            <div className="flex items-center">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <span className="currency-symbol">$</span>
                </div>
                <Input 
                  type="text"
                  readOnly 
                  value={totalExpenses.toFixed(2)} 
                  className="readonly-field pl-7 w-40"
                />
              </div>
              <Button 
                type="button" 
                variant="secondary"
                className="ml-4"
                onClick={handleCalculateExpenses}
              >
                Calculate
              </Button>
            </div>
            <Label className="mt-1 text-sm text-foreground/60">Total Expenses</Label>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <FormField
              control={form.control}
              name="depositAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deposit Amount</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <span className="text-gray-500">$</span>
                      </div>
                      <Input 
                        {...field}
                        type="number"
                        step="0.01"
                        min="0"
                        className="pl-7"
                        onChange={(e) => {
                          const value = e.target.value === "" ? undefined : parseFloat(e.target.value);
                          field.onChange(value);
                        }}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div>
              <div className="flex items-center">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <span className="currency-symbol">$</span>
                  </div>
                  <Input 
                    type="text"
                    readOnly 
                    value={(form.watch("depositAmount") || 0).toFixed(2)} 
                    className="readonly-field pl-7 w-40"
                  />
                </div>
                <Button 
                  type="button" 
                  variant="secondary"
                  className="ml-4"
                  onClick={handleCalculateDeposit}
                >
                  Calculate
                </Button>
              </div>
              <Label className="mt-1 text-sm text-foreground/60">Deposit Amount Calculated</Label>
            </div>
          </div>
          
          <div className="mb-6">
            <FormField
              control={form.control}
              name="depositReceivedBy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deposit Received By</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full md:w-1/2">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Sera">Sera</SelectItem>
                      <SelectItem value="Seth">Seth</SelectItem>
                      <SelectItem value="Sasha">Sasha</SelectItem>
                      <SelectItem value="Frenchie">Frenchie</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div className="mb-6">
            <FormField
              control={form.control}
              name="paymentProcessUsed"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="required">Payment Process Used</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full md:w-1/2">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Venmo">Venmo</SelectItem>
                      <SelectItem value="Cash App">Cash App</SelectItem>
                      <SelectItem value="Apple Pay">Apple Pay</SelectItem>
                      <SelectItem value="BTC">BTC</SelectItem>
                      <SelectItem value="ETH">ETH</SelectItem>
                      <SelectItem value="Stripe">Stripe</SelectItem>
                      <SelectItem value="Square">Square</SelectItem>
                      <SelectItem value="Bank Wire">Bank Wire</SelectItem>
                      <SelectItem value="Cash Deposit">Cash Deposit</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div className="mb-6">
            <div className="flex items-center">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <span className="currency-symbol">$</span>
                </div>
                <Input 
                  type="text"
                  readOnly 
                  value={dueToProvider.toFixed(2)} 
                  className="readonly-field pl-7 w-40"
                />
              </div>
              <Button 
                type="button" 
                variant="secondary"
                className="ml-4"
                onClick={handleCalculateDue}
              >
                Calculate
              </Button>
            </div>
            <Label className="mt-1 text-sm text-foreground/60">Due To Provider Upon Arrival</Label>
          </div>
          
          <div className="mb-6">
            <FormField
              control={form.control}
              name="hasClientNotes"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Leave Notes On This Client</FormLabel>
                  </div>
                </FormItem>
              )}
            />
          </div>
          
          {hasClientNotes && (
            <div className="mb-6">
              <FormField
                control={form.control}
                name="clientNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        rows={4}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}
          
          <div className="mb-6">
            <FormField
              control={form.control}
              name="dispositionStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Disposition Status</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full md:w-1/2">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Complete">Complete</SelectItem>
                      <SelectItem value="Reschedule">Reschedule</SelectItem>
                      <SelectItem value="Cancel">Cancel</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          {/* Complete Section */}
          {dispositionStatus === "Complete" && (
            <div>
              <h4 className="font-medium text-foreground/80 mb-3">Complete</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <FormField
                  control={form.control}
                  name="totalCollectedCash"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Collected In Cash</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <span className="text-gray-500">$</span>
                          </div>
                          <Input 
                            {...field}
                            type="number"
                            step="0.01"
                            min="0"
                            className="pl-7"
                            onChange={(e) => {
                              const value = e.target.value === "" ? undefined : parseFloat(e.target.value);
                              field.onChange(value);
                            }}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="totalCollectedDigital"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Collected Digitally</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <span className="text-gray-500">$</span>
                          </div>
                          <Input 
                            {...field}
                            type="number"
                            step="0.01"
                            min="0"
                            className="pl-7"
                            onChange={(e) => {
                              const value = e.target.value === "" ? undefined : parseFloat(e.target.value);
                              field.onChange(value);
                            }}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="mb-6">
                <div className="flex items-center">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <span className="currency-symbol">$</span>
                    </div>
                    <Input 
                      type="text"
                      readOnly 
                      value={totalCollected.toFixed(2)} 
                      className="readonly-field pl-7 w-40"
                    />
                  </div>
                  <Button 
                    type="button" 
                    variant="secondary"
                    className="ml-4"
                    onClick={handleCalculateTotal}
                  >
                    Calculate
                  </Button>
                </div>
                <Label className="mt-1 text-sm text-foreground/60">Total Collected</Label>
              </div>
              
              <div className="mb-6">
                <FormField
                  control={form.control}
                  name="paymentProcessor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Processor</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full md:w-1/2">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Venmo">Venmo</SelectItem>
                          <SelectItem value="Cash App">Cash App</SelectItem>
                          <SelectItem value="Apple Pay">Apple Pay</SelectItem>
                          <SelectItem value="BTC">BTC</SelectItem>
                          <SelectItem value="ETH">ETH</SelectItem>
                          <SelectItem value="Stripe">Stripe</SelectItem>
                          <SelectItem value="Square">Square</SelectItem>
                          <SelectItem value="Bank Wire">Bank Wire</SelectItem>
                          <SelectItem value="Cash Deposit">Cash Deposit</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="mb-6">
                <FormField
                  control={form.control}
                  name="paymentNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes on Payments</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="mb-6">
                <FormField
                  control={form.control}
                  name="seeClientAgain"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="required">Would you be open to seeing this client again?</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={(value) => field.onChange(value === "yes")}
                          defaultValue={field.value === undefined ? undefined : field.value ? "yes" : "no"}
                          className="flex space-x-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="yes" id="see-again-yes" />
                            <Label htmlFor="see-again-yes">Yes</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="no" id="see-again-no" />
                            <Label htmlFor="see-again-no">No</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="mb-6">
                <FormField
                  control={form.control}
                  name="appointmentNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Please contribute notes about how your call went</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          rows={4}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}
          
          {/* Reschedule Section */}
          {dispositionStatus === "Reschedule" && (
            <div>
              <h4 className="font-medium text-foreground/80 mb-3">Reschedule</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <FormField
                  control={form.control}
                  name="updatedStartDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Updated Appointment Start Date</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="updatedStartTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Updated Appointment Start Time</FormLabel>
                      <FormControl>
                        <Input {...field} type="time" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <FormField
                  control={form.control}
                  name="updatedEndDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Updated Appointment End Date</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="updatedEndTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Updated Appointment End Time</FormLabel>
                      <FormControl>
                        <Input {...field} type="time" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}
          
          {/* Cancel Section */}
          {dispositionStatus === "Cancel" && (
            <div>
              <h4 className="font-medium text-foreground/80 mb-3">Canceled</h4>
              <div className="mb-6">
                <FormField
                  control={form.control}
                  name="whoCanceled"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Who Canceled</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex space-x-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="client" id="client-canceled" />
                            <Label htmlFor="client-canceled">Client</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="provider" id="provider-canceled" />
                            <Label htmlFor="provider-canceled">Provider</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="mb-6">
                <FormField
                  control={form.control}
                  name="cancellationDetails"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cancellation Details</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          rows={4}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}
        </div>
        
        {/* Form Action Buttons */}
        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline">
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Appointment"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
