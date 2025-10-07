"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

export function LoginForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simple demo login - accepts any email/password
    setTimeout(() => {
      toast({
        title: "Welcome to CuraGenesis",
        description: "Login successful!",
      });
      router.push("/dashboard");
    }, 1000);
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
        {/* DNA Helix Logo - 30% bigger */}
        <div className="mb-6" style={{ filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.6))' }}>
          <img 
            src="/curagenesis-logo.jpg" 
            alt="CuraGenesis DNA Logo" 
            className="h-[170px] w-[170px] object-contain"
          />
        </div>
        
        {/* Tagline */}
        <p 
          className="text-sm font-medium tracking-widest uppercase"
          style={{ color: '#B0BDC5' }}
        >
          The Beginning of Health and Wellness
        </p>
      </div>

      {/* Login Card */}
      <div 
        className="relative z-10 w-full max-w-md p-8 rounded-xl"
        style={{ 
          backgroundColor: '#102833',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)'
        }}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email Input */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-regular" style={{ color: '#B0BDC5' }}>
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="agent@curagenesis.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
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
            className="w-full h-11 text-white font-semibold rounded-lg transition-all hover:shadow-lg"
            style={{
              background: 'linear-gradient(135deg, #007F96 0%, #0E9FB7 100%)',
            }}
            disabled={isLoading}
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </Button>

          {/* Demo Mode Note */}
          <p className="text-center text-xs mt-4" style={{ color: '#6B7A85' }}>
            Demo mode - use any credentials to continue
          </p>
        </form>
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 text-center text-xs" style={{ color: '#6B7A85' }}>
        <p>© 2025 CuraGenesis. All rights reserved.</p>
      </div>
    </div>
  );
}
