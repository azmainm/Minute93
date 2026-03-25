"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { LogIn, Mail, Lock, Chrome } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { login } from "@/lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }
    setLoading(true);
    try {
      const { accessToken } = await login(email, password);
      localStorage.setItem("token", accessToken);
      toast.success("Welcome back!");
      window.location.href = "/";
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

  return (
    <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link href="/" className="mx-auto mb-4 flex items-center gap-2">
            <Image src="/logo.png" alt="Minute93" width={32} height={32} className="rounded-md" />
            <span className="text-lg font-bold tracking-tight">
              Minute<span className="text-primary">93</span>
            </span>
          </Link>
          <CardTitle className="text-xl">Welcome back</CardTitle>
          <p className="text-sm text-muted-foreground">
            Sign in to your account to continue
          </p>
        </CardHeader>
        <CardContent>
          {/* Google OAuth */}
          <a href={`${API_BASE}/auth/google`}>
            <Button variant="outline" className="w-full gap-2" type="button">
              <Chrome className="size-4" />
              Continue with Google
            </Button>
          </a>

          <div className="my-6 flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">or</span>
            <Separator className="flex-1" />
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <Button type="submit" className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90" disabled={loading}>
              {loading ? <Spinner className="size-4" /> : <LogIn className="size-4" />}
              Sign In
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-medium text-primary hover:text-primary/80">
              Sign up
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
