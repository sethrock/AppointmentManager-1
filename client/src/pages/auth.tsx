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
import { Calendar } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;
type AuthStep = "login" | "mfa" | "setup" | "recovery";

export default function AuthPage() {
  const { toast } = useToast();
  const { login, user, needsMfaSetup, mfaVerified, isLoading } = useAuth();
  const [step, setStep] = useState<AuthStep>("login");
  const [mfaToken, setMfaToken] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [setupSecret, setSetupSecret] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [setupStarted, setSetupStarted] = useState(false);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormData) =>
      apiRequest("POST", "/api/auth/login", data),
    onSuccess: async (data) => {
      if (data.mfaRequired && data.mfaToken) {
        setMfaToken(data.mfaToken);
        setStep("mfa");
        setOtpCode("");
        return;
      }

      if (data.needsMfaSetup && data.user) {
        await login(data.user);
        await beginMfaSetup();
        return;
      }

      if (data.user) {
        await login(data.user);
        window.location.href = "/";
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Invalid email or password",
        variant: "destructive",
      });
    },
  });

  const beginMfaSetup = async () => {
    try {
      const setup = await apiRequest("POST", "/api/auth/mfa/setup");
      setQrDataUrl(setup.qrDataUrl);
      setSetupSecret(setup.secret);
      setStep("setup");
      setOtpCode("");
      setSetupStarted(true);
    } catch (error: any) {
      toast({
        title: "MFA setup failed",
        description: error.message || "Could not start authenticator setup",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (isLoading || setupStarted || step === "recovery") return;
    if (user && needsMfaSetup && !mfaVerified) {
      beginMfaSetup();
    } else if (user && mfaVerified && !needsMfaSetup && step === "login") {
      window.location.href = "/";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, needsMfaSetup, mfaVerified, isLoading, setupStarted, step]);

  const verifyMfaMutation = useMutation({
    mutationFn: async () =>
      apiRequest("POST", "/api/auth/mfa/verify", {
        mfaToken,
        code: otpCode,
      }),
    onSuccess: async (data) => {
      await login(data.user);
      toast({ title: "Success", description: "Signed in successfully." });
      window.location.href = "/";
    },
    onError: (error: any) => {
      toast({
        title: "Invalid code",
        description: error.message || "Check your authenticator app and try again.",
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
    onError: (error: any) => {
      toast({
        title: "Could not enable MFA",
        description: error.message || "Invalid authentication code",
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
          <CardTitle className="text-2xl font-bold">Appointment Manager</CardTitle>
          <CardDescription>
            {step === "login" && "Sign in with your admin account"}
            {step === "mfa" && "Enter the code from Google Authenticator"}
            {step === "setup" && "Scan this QR code with Google Authenticator"}
            {step === "recovery" && "Save these recovery codes in a safe place"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === "login" && (
            <Form {...loginForm}>
              <form
                onSubmit={loginForm.handleSubmit((data) => loginMutation.mutate(data))}
                className="space-y-4"
              >
                <FormField
                  control={loginForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="you@example.com"
                          {...field}
                          data-testid="input-login-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={loginForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          {...field}
                          data-testid="input-login-password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loginMutation.isPending}
                  data-testid="button-login"
                >
                  {loginMutation.isPending ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </Form>
          )}

          {(step === "mfa" || step === "setup") && (
            <div className="space-y-4">
              {step === "setup" && (
                <>
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
                </>
              )}

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

              {step === "mfa" && (
                <Input
                  placeholder="Or paste a recovery code"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  className="font-mono text-sm"
                />
              )}

              <Button
                className="w-full"
                disabled={
                  otpCode.replace(/\s/g, "").length < 6 ||
                  verifyMfaMutation.isPending ||
                  enableMfaMutation.isPending
                }
                onClick={() =>
                  step === "mfa"
                    ? verifyMfaMutation.mutate()
                    : enableMfaMutation.mutate()
                }
                data-testid="button-mfa-submit"
              >
                {step === "mfa" ? "Verify and sign in" : "Enable authenticator"}
              </Button>

              {step === "mfa" && (
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setStep("login");
                    setMfaToken("");
                    setOtpCode("");
                  }}
                >
                  Back to login
                </Button>
              )}
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
                data-testid="button-recovery-continue"
              >
                I saved my codes — continue
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
