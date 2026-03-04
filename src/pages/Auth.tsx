import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight } from "lucide-react";
import logo from "@/assets/logo.png";

const Auth = () => {
  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useApp();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login(name || email.split("@")[0]);
    navigate("/onboarding");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background grid-bg px-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary glow-primary">
            <GraduationCap className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">GatiSchool</h1>
          <p className="text-sm text-muted-foreground">Organize your entire school day</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card p-6 md:p-8 border-glow-hover transition-all">
          <h2 className="mb-6 text-lg font-semibold text-foreground">
            {isSignup ? "Create your account" : "Welcome back"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignup && (
              <div>
                <label className="mb-1.5 block text-sm text-muted-foreground">Full Name</label>
                <Input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Enter your name"
                  required={isSignup}
                  className="bg-input border-border"
                />
              </div>
            )}
            <div>
              <label className="mb-1.5 block text-sm text-muted-foreground">Email</label>
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@school.edu"
                required
                className="bg-input border-border"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-muted-foreground">Password</label>
              <Input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="bg-input border-border"
              />
            </div>

            <Button type="submit" className="w-full glow-primary-sm" size="lg">
              {isSignup ? "Create Account" : "Sign In"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setIsSignup(!isSignup)}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {isSignup ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Your data is stored locally. Enable Cloud for persistent storage.
        </p>
      </div>
    </div>
  );
};

export default Auth;
