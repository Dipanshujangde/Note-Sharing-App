"use client";
import { use, useEffect, useState } from "react";
import { Lock, LockOpen, KeyRound, Eye, AlertTriangle, FileText, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Status = "loading" | "locked" | "open" | "error";

export default function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [meta, setMeta] = useState<any>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState<any>(null);
  const [viewCount, setViewCount] = useState(0);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/shares/${token}`);
      const d = await res.json();
      if (!res.ok) { setError(d.error ?? "Invalid share link"); setStatus("error"); return; }
      setMeta(d);
      if (d.status !== "active") {
        setError(d.status === "revoked" ? "This link has been revoked by the owner"
          : d.status === "expired" ? "This link has expired"
          : "This one-time link has already been used");
        setStatus("error");
        return;
      }
      if (d.accessType === "public") await unlock(undefined);
      else setStatus("locked");
    })();
  }, [token]);

  async function unlock(k?: string) {
    setError("");
    const res = await fetch(`/api/shares/${token}/unlock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(k ? { key: k } : {})
    });
    const d = await res.json();
    if (!res.ok) { setError(d.error ?? "Failed to open"); return; }
    setNote(d); setViewCount(d.viewCount); setStatus("open");
  }

  if (status === "loading") {
    return (
      <div className="flex justify-center pt-24 animate-fade-in">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50"><Lock className="h-6 w-6 text-indigo-500 animate-pulse" /></span>
          <p className="text-sm">Opening secure link...</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex justify-center animate-fade-up">
        <Card className="w-full max-w-md text-center shadow-xl shadow-red-500/5">
          <CardHeader className="items-center space-y-3">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500"><AlertTriangle className="h-7 w-7" /></span>
            <div>
              <CardTitle>Link unavailable</CardTitle>
              <CardDescription className="mt-1.5">{error}</CardDescription>
            </div>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (status === "locked") {
    return (
      <div className="flex justify-center animate-fade-up">
        <Card className="w-full max-w-sm shadow-xl shadow-indigo-500/5">
          <CardHeader className="items-center text-center space-y-3">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-brand text-white shadow-lg shadow-indigo-500/25"><Lock className="h-7 w-7" /></span>
            <div>
              <CardTitle>Protected note</CardTitle>
              <CardDescription className="mt-1.5">
                {meta?.locked
                  ? "Temporarily locked due to too many failed attempts. Please try again later."
                  : "Enter the access key shared with you to unlock this note."}
              </CardDescription>
            </div>
            {meta && (
              <div className="flex justify-center gap-2 pt-1">
                <Badge variant="indigo">{meta.shareType === "one_time" ? "One-time" : "Time-based"}</Badge>
                {meta.expiryAt && <Badge variant="neutral">Expires {new Date(meta.expiryAt).toLocaleString()}</Badge>}
              </div>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={e => { e.preventDefault(); unlock(key); }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="key">Access key</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="key" required value={key} onChange={e => setKey(e.target.value)} disabled={meta?.locked}
                    placeholder="e.g. aB3xK9pQ" className="pl-9 font-mono tracking-wider" />
                </div>
              </div>
              {error && <p className="text-sm text-destructive bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
              <Button className="w-full" disabled={meta?.locked}>
                <LockOpen className="h-4 w-4" /> Unlock note
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex justify-center animate-fade-up">
      <Card className="w-full max-w-2xl shadow-xl shadow-indigo-500/5 overflow-hidden">
        <div className="bg-gradient-brand px-6 py-5 text-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur"><FileText className="h-5 w-5" /></span>
            <h1 className="text-lg font-bold truncate">{note.title}</h1>
          </div>
          <Badge className="bg-white/20 text-white border-white/30 shrink-0"><Eye className="h-3 w-3" /> {viewCount} view{viewCount === 1 ? "" : "s"}</Badge>
        </div>
        <CardContent className="pt-6">
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{note.content}</p>
          <p className="mt-6 flex items-center gap-1.5 text-xs text-muted-foreground border-t pt-4">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            Shared securely via NoteShare {meta?.shareType === "one_time" && "· this link has now expired"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
