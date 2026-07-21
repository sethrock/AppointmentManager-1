import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Calendar, Loader2 } from "lucide-react";

const passwordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type PasswordFormData = z.infer<typeof passwordSchema>;
type Step = "loading" | "password" | "setup" | "recovery" | "error";

export default function OnboardPage() {
  const { toast } = useToast();
  const { login } = useAuth();
  const [step, setStep] = useState<Step>("loading");
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [setupSecret, setSetupSecret] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);

  const form = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  useEffect(() => {
    const inviteToken = new URLSearchParams(window.location.search).get("token") || "";
    setToken(inviteToken);
    if (!inviteToken) {
      setStep("error");
      setError("Missing invite token. Ask an admin to send a new invite link.");
      return;
    }

    (async () => {
      try {
        const data = await apiRequest(
          "GET",
          `/api/auth/invite?token=${encodeURIComponent(inviteToken)}`,
        );
        setEmail(data.email);
        setStep("password");
      } catch (err: any) {
        setStep("error");
        setError(err.message || "Invalid or expired invite link");
      }
    })();
  }, []);

  const beginMfaSetup = async () => {
    const setup = await apiRequest("POST", "/api/auth/mfa/setup");
    setQrDataUrl(setup.qrDataUrl);
    setSetupSecret(setup.secret);
    setStep("setup");
    setOtpCode("");
  };

  const completeMutation = useMutation({
    mutationFn: async (data: PasswordFormData) =>
      apiRequest("POST", "/api/auth/invite/complete", {
        token,
        password: data.password,
        confirmPassword: data.confirmPassword,
      }),
    onSuccess: async (data) => {
      await login(data.user);
      toast({
        title: "Password saved",
        description: "Next, scan the QR code with Google Authenticator.",
      });
      try {
        await beginMfaSetup();
      } catch (err: any) {
        setStep("error");
        setError(err.message || "Could not start authenticator setup");
      }
    },
    onError: (err: any) => {
      toast({
        title: "Could not save password",
        description: err.message || "Try again or request a new invite.",
        variant: "destructive",
      });
    },
  });

  const enableMfaMutation = useMutation({
    mutationFn: async () =>
      apiRequest("POST", "/api/auth/mfa/enable", { code: otpCode }),
    onSuccess: async (data) => {
      await login(data.user);
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setRecoveryCodes(data.recoveryCodes || []);
      setStep("recovery");
      toast({
        title: "Authenticator enabled",
        description: "Save your recovery codes before continuing.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Invalid code",
        description: err.message || "Check your authenticator app and try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary rounded-lg flex items-center justify-center mb-4">
            <Calendar className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold">Admin onboarding</CardTitle>
          <CardDescription>
            {step === "loading" && "Checking your invite…"}
            {step === "password" && `Choose a password for ${email}`}
            {step === "setup" && "Scan this QR code with Google Authenticator"}
            {step === "recovery" && "Save these recovery codes in a safe place"}
            {step === "error" && "Invite problem"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === "loading" && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          )}

          {step === "error" && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          {step === "password" && (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit((data) => completeMutation.mutate(data))}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          {...field}
                          data-testid="input-onboard-password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          {...field}
                          data-testid="input-onboard-confirm"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full"
                  disabled={completeMutation.isPending}
                  data-testid="button-onboard-password"
                >
                  {completeMutation.isPending
                    ? "Saving…"
                    : "Continue to authenticator setup"}
                </Button>
              </form>
            </Form>
          )}

          {step === "setup" && (
            <div className="space-y-4">
              {qrDataUrl && (
                <img
                  src={qrDataUrl}
                  alt="Authenticator QR code"
                  className="mx-auto w-48 h-48 rounded-md border"
                />
              )}
              <p className="text-xs text-muted-foreground break-all text-center">
                Manual secret: <span className="font-mono">{setupSecret}</span>
              </p>
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <Button
                className="w-full"
                disabled={
                  otpCode.replace(/\s/g, "").length < 6 ||
                  enableMfaMutation.isPending
                }
                onClick={() => enableMfaMutation.mutate()}
                data-testid="button-onboard-mfa"
              >
                Enable authenticator
              </Button>
            </div>
          )}

          {step === "recovery" && (
            <div className="space-y-4">
              <ul className="grid grid-cols-2 gap-2 font-mono text-sm bg-muted p-3 rounded-md">
                {recoveryCodes.map((code) => (
                  <li key={code}>{code}</li>
                ))}
              </ul>
              <Button
                className="w-full"
                onClick={() => {
                  window.location.href = "/";
                }}
                data-testid="button-onboard-done"
              >
                I saved my codes — go to dashboard
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
