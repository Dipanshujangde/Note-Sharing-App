"use client";
import { use, useEffect, useState } from "react";
import {
  Copy,
  Check,
  Ban,
  Eye,
  Clock,
  Infinity as InfinityIcon,
  Globe,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ShareInfo {
  id: string;
  token: string;
  shareType: string;
  accessType: string;
  expiryAt?: string | null;
  usedAt?: string | null;
  revokedAt?: string | null;
  viewCount: number;
  url: string;
}

export default function NoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState("");

  async function load() {
    const res = await fetch(`/api/notes/${id}`);
    const d = await res.json();
    if (!res.ok) {
      setError(d.error ?? "Not found");
    } else {
      setData(d);
    }
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, [id]);

  async function revoke(shareId: string) {
    await fetch(`/api/shares/${shareId}/revoke`, { method: "POST" });
    load();
  }
  async function copy(text: string, shareId: string) {
    await navigator.clipboard.writeText(text);
    setCopiedId(shareId);
    setTimeout(() => setCopiedId(""), 1500);
  }

  if (loading) return <p className="text-muted-foreground">Loading...</p>;
  if (error) return <p className="text-destructive">{error}</p>;

  const statusOf = (s: ShareInfo) =>
    s.revokedAt
      ? "revoked"
      : s.shareType === "one_time" && s.usedAt
        ? "used"
        : s.shareType === "time_based" &&
            s.expiryAt &&
            new Date(s.expiryAt) <= new Date()
          ? "expired"
          : "active";

  const statusBadge: Record<string, { label: string; variant: any }> = {
    active: { label: "Active", variant: "success" },
    revoked: { label: "Revoked", variant: "danger" },
    used: { label: "Used", variant: "neutral" },
    expired: { label: "Expired", variant: "warning" },
  };

  return (
    <div className="space-y-8 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{data.note.title}</h1>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed bg-white border rounded-xl p-5 shadow-sm">
          {data.note.content}
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Share links</h2>
        {data.shares.length === 0 && (
          <p className="text-sm text-muted-foreground">No share links yet.</p>
        )}
        {data.shares.map((s: ShareInfo) => {
          const st = statusOf(s);
          const b = statusBadge[st];
          return (
            <Card key={s.id} className="transition-shadow hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-500">
                      {s.shareType === "one_time" ? (
                        <InfinityIcon className="h-4 w-4" />
                      ) : (
                        <Clock className="h-4 w-4" />
                      )}
                    </span>
                    <CardTitle className="text-base">
                      {s.shareType === "one_time"
                        ? "One-time link"
                        : "Time-based link"}
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        s.accessType === "password" ? "warning" : "indigo"
                      }
                    >
                      {s.accessType === "password" ? (
                        <>
                          <ShieldCheck className="h-3 w-3" /> Protected
                        </>
                      ) : (
                        <>
                          <Globe className="h-3 w-3" /> Public
                        </>
                      )}
                    </Badge>
                    <Badge variant={b.variant}>{b.label}</Badge>
                    <Badge variant="neutral">
                      <Eye className="h-3 w-3" /> {s.viewCount}
                    </Badge>
                  </div>
                </div>
                <CardDescription>
                  {s.expiryAt
                    ? `Expires ${new Date(s.expiryAt).toLocaleString()}`
                    : "No expiry — self-destructs after first view"}
                  {s.usedAt && ` · Used ${new Date(s.usedAt).toLocaleString()}`}
                  {s.revokedAt &&
                    ` · Revoked ${new Date(s.revokedAt).toLocaleString()}`}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center gap-2">
                <input
                  readOnly
                  value={s.url}
                  onFocus={(e) => e.target.select()}
                  className="flex h-9 w-full rounded-lg border border-input bg-gray-50 px-3 font-mono text-xs text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copy(s.url, s.id)}
                >
                  {copiedId === s.id ? (
                    <Check className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                {st === "active" && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => revoke(s.id)}
                  >
                    <Ban className="h-4 w-4" /> Revoke
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
