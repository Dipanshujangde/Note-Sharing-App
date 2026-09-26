"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserPlus, FileLock2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password })
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error ?? "Registration failed"); return; }
    router.push("/notes");
    router.refresh();
  }

  return (
    <div className="flex justify-center animate-fade-up">
      <Card className="w-full max-w-sm shadow-xl shadow-indigo-500/5">
        <CardHeader className="items-center text-center space-y-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-brand text-white shadow-lg shadow-indigo-500/25">
            <FileLock2 className="h-6 w-6" />
          </span>
          <div>
            <CardTitle className="text-2xl">Create account</CardTitle>
            <CardDescription>Start sharing notes securely</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" required placeholder="Jane Doe" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required minLength={8} placeholder="Min 8 characters" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            {error && <p className="text-sm text-destructive bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            <Button className="w-full" disabled={loading}>
              {loading ? "Creating account..." : <><UserPlus className="h-4 w-4" /> Create account</>}
            </Button>
            <p className="text-sm text-muted-foreground text-center">Have an account? <Link href="/login" className="text-indigo-600 font-medium hover:underline">Login</Link></p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
