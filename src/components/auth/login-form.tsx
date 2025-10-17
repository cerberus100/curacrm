"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        // If backend returns password reset requirement, route accordingly
        if (data?.reason === "PASSWORD_RESET_REQUIRED") {
          window.location.href = "/force-change-password";
          return;
        }
        throw new Error(data.error || "Login failed");
      }

      // Store user data for client-side use
      localStorage.setItem("current_user", JSON.stringify(data.user));
      
      toast({
        title: "✅ Welcome to CuraGenesis",
        description: `Logged in as ${data.user.role === "ADMIN" ? "Admin" : data.user.role === "RECRUITER" ? "Recruiter" : "Sales Agent"}`,
      });
      
      // Redirect based on role and onboarding status
      if (data.user.role === "AGENT" && data.user.onboardStatus !== "ACTIVE") {
        window.location.href = "/onboard";
      } else {
        window.location.href = "/dashboard";
      }
    } catch (error) {
      toast({
        title: "Login Failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen w-full px-4">
      {/* Radial glow behind logo */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div 
          className="w-[600px] h-[600px] rounded-full opacity-30"
          style={{
            background: 'radial-gradient(circle, rgba(14, 159, 183, 0.15) 0%, transparent 70%)'
          }}
        />
      </div>

      {/* Logo and Branding - Centered */}
      <div className="relative z-10 flex flex-col items-center mb-12">
        {/* CURAGENESIS Wordmark */}
        <h1 
          className="text-5xl font-bold tracking-wide mb-3"
          style={{ 
            color: '#FFFFFF',
            textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)'
          }}
        >
          CURA<span style={{ color: '#0E9FB7' }}>GENESIS</span>
        </h1>
        
        {/* Tagline */}
        <p 
          className="text-lg tracking-widest"
          style={{ color: '#B0BDC5' }}
        >
          SALES CRM PORTAL
        </p>
      </div>

      {/* Form Container */}
      <div className="relative z-10 w-full max-w-md">
        <div 
          className="rounded-3xl p-8"
          style={{
            backgroundColor: 'rgba(11, 26, 34, 0.85)',
            border: '1px solid rgba(30, 65, 82, 0.5)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)'
          }}
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Input */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-regular" style={{ color: '#B0BDC5' }}>
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus
                className="h-11 bg-[#0B1A22] border-[#1A2F3E] text-white placeholder:text-gray-500 focus:border-[#0E9FB7] focus:ring-1 focus:ring-[#0E9FB7] transition-colors"
              />
            </div>
            
            {/* Password Input */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-regular" style={{ color: '#B0BDC5' }}>
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="h-11 bg-[#0B1A22] border-[#1A2F3E] text-white placeholder:text-gray-500 focus:border-[#0E9FB7] focus:ring-1 focus:ring-[#0E9FB7] transition-colors"
              />
            </div>
            
            {/* Forgot Password Link */}
            <div className="text-right">
              <a 
                href="/auth/forgot-password"
                className="text-sm text-[#0E9FB7] hover:text-[#0CC5E0] transition-colors"
              >
                Forgot Password?
              </a>
            </div>

            {/* Remember Me */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="remember"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-[#1A2F3E] bg-[#0B1A22] text-[#0E9FB7] focus:ring-[#0E9FB7] focus:ring-offset-0"
              />
              <Label 
                htmlFor="remember" 
                className="text-sm font-regular cursor-pointer" 
                style={{ color: '#B0BDC5' }}
              >
                Remember me
              </Label>
            </div>

            {/* Sign In Button */}
            <Button 
              type="submit" 
              disabled={isLoading}
              className="w-full h-11 text-white font-medium rounded-lg transition-all duration-200 transform hover:scale-[1.02]"
              style={{
                backgroundColor: '#0E9FB7',
                boxShadow: '0 4px 15px rgba(14, 159, 183, 0.3)',
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}