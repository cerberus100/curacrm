import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: 'linear-gradient(135deg, #0B1A22 0%, #122B37 50%, #1A2F3E 100%)'
      }}
    >
      <LoginForm />
    </div>
  );
}
