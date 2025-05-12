import EmailLoginForm from "@/components/auth/EmailLoginForm";

export default function LoginPage() {
  return (
    <div className="container mx-auto py-12">
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Appointment Manager
        </h1>
        <EmailLoginForm />
      </div>
    </div>
  );
}