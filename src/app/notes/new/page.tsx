"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Link2, KeyRound, Copy, Check, PartyPopper, Clock, Infinity as InfinityIcon, Globe, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function Option({ active, onClick, icon: Icon, title, desc }: any) {
  return (
    <button type="button" onClick={onClick}
      className={cn(
        "flex flex-col items-start gap-1.5 rounded-xl border p-3.5 text-left transition-all duration-150",
        active ? "border-indigo-400 bg-indigo-50/60 ring-2 ring-indigo-500/30 shadow-sm" : "bg-white hover:border-indigo-200 hover:bg-indigo-50/30"
      )}>
      <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", active ? "bg-gradient-brand text-white" : "bg-indigo-50 text-indigo-500")}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="text-sm font-semibold">{title}</span>
      <span className="text-xs text-muted-foreground leading-relaxed">{desc}</span>
    </button>
  );
}

export default function NewNotePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [shareType, setShareType] = useState<"one_time" | "time_based">("time_based");
  const [accessType, setAccessType] = useState<"public" | "password">("public");
  const [expiryAt, setExpiryAt] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(""); setResult(null);
    const body: any = { title, content, shareType, accessType };
    if (shareType === "time_based" && expiryAt) body.expiryAt = new Date(expiryAt).toISOString();
    if (accessType === "password" && password) body.password = password;
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error ?? "Failed to create note"); return; }
    setResult(data);
  }

  if (result) return <SuccessCard result={result} onReset={() => { setResult(null); setTitle(""); setContent(""); setPassword(""); setExpiryAt(""); }} onView={() => router.push(`/notes/${result.note.id}`)} />;

  return (
    <div className="mx-auto max-w-xl animate-fade-up">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">New note</h1>
        <p className="text-sm text-muted-foreground mt-1">Create a note and generate a secure share link.</p>
      </div>
      <Card className="shadow-xl shadow-indigo-500/5">
        <CardContent className="pt-6">
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" required maxLength={200} placeholder="e.g. API credentials for the demo" value={title} onChange={e => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              <Textarea id="content" required placeholder="Write your note here..." value={content} onChange={e => setContent(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Share type</Label>
              <div className="grid grid-cols-2 gap-3">
                <Option active={shareType === "time_based"} onClick={() => setShareType("time_based")} icon={Clock} title="Time-based" desc="Expires at a chosen date & time" />
                <Option active={shareType === "one_time"} onClick={() => setShareType("one_time")} icon={InfinityIcon} title="One-time" desc="Self-destructs after first view" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Access type</Label>
              <div className="grid grid-cols-2 gap-3">
                <Option active={accessType === "public"} onClick={() => setAccessType("public")} icon={Globe} title="Public" desc="Anyone with the link can view" />
                <Option active={accessType === "password"} onClick={() => setAccessType("password")} icon={ShieldCheck} title="Protected" desc="Requires an access key to unlock" />
              </div>
            </div>

            {shareType === "time_based" && (
              <div className="space-y-2 animate-fade-in">
                <Label htmlFor="expiryAt">Expires at</Label>
                <Input id="expiryAt" type="datetime-local" required value={expiryAt} onChange={e => setExpiryAt(e.target.value)} />
              </div>
            )}
            {accessType === "password" && (
              <div className="space-y-2 animate-fade-in">
                <Label htmlFor="password">Password <span className="text-muted-foreground font-normal">(optional — a dynamic key is auto-generated if empty)</span></Label>
                <Input id="password" type="text" minLength={4} value={password} onChange={e => setPassword(e.target.value)} placeholder="Leave blank to auto-generate" />
              </div>
            )}

            {error && <p className="text-sm text-destructive bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            <Button className="w-full" disabled={loading}>{loading ? "Creating..." : "Create note & generate link"}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function SuccessCard({ result, onReset, onView }: any) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const copy = async (text: string, which: "link" | "key") => {
    await navigator.clipboard.writeText(text);
    if (which === "link") { setCopiedLink(true); setTimeout(() => setCopiedLink(false), 1500); }
    else { setCopiedKey(true); setTimeout(() => setCopiedKey(false), 1500); }
  };

  return (
    <div className="mx-auto max-w-xl animate-fade-up">
      <Card className="shadow-xl shadow-indigo-500/5 overflow-hidden">
        <div className="bg-gradient-brand px-6 py-6 text-white">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 backdrop-blur"><PartyPopper className="h-5 w-5" /></span>
            <div>
              <CardTitle className="text-white text-lg">Note created</CardTitle>
              <CardDescription className="text-white/80">Your secure share link is ready</CardDescription>
            </div>
          </div>
        </div>
        <CardContent className="pt-6 space-y-5">
          <div className="flex flex-wrap gap-2">
            <Badge variant="indigo">{result.share.shareType === "one_time" ? "One-time" : "Time-based"}</Badge>
            <Badge variant={result.share.accessType === "password" ? "warning" : "success"}>
              {result.share.accessType === "password" ? "Password-protected" : "Public"}
            </Badge>
            {result.share.expiryAt && <Badge variant="neutral">Expires {new Date(result.share.expiryAt).toLocaleString()}</Badge>}
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1.5"><Link2 className="h-3.5 w-3.5 text-indigo-500" /> Share link</Label>
            <div className="flex gap-2">
              <Input readOnly value={result.share.url} onFocus={e => e.target.select()} className="font-mono text-xs" />
              <Button variant="outline" onClick={() => copy(result.share.url, "link")}>
                {copiedLink ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {result.share.accessKey && (
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><KeyRound className="h-3.5 w-3.5 text-amber-500" /> Access key</Label>
              <div className="flex gap-2">
                <Input readOnly value={result.share.accessKey} onFocus={e => e.target.select()} className="font-mono text-xs bg-amber-50/50 border-amber-200" />
                <Button variant="outline" onClick={() => copy(result.share.accessKey, "key")}>
                  {copiedKey ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Save this key now — it is shown only once and cannot be recovered.
              </p>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button onClick={onView}>View note</Button>
            <Button variant="outline" onClick={onReset}>Create another</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
