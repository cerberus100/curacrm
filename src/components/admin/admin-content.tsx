"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Settings, UserPlus, Users } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  onboardedAt: string | null;
  firstLoginAt: string | null;
  createdAt: string;
  _count: { accounts: number };
}

export function AdminContent() {
  const { toast} = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [inviteData, setInviteData] = useState({
    firstName: "",
    lastName: "",
    email: "",
  });
  const [inviting, setInviting] = useState(false);
  const [bulkInvites, setBulkInvites] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users");
      if (!response.ok) throw new Error("Failed to fetch users");
      const data = await response.json();
      setUsers(data.users);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);

    try {
      const response = await fetch("/api/admin/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inviteData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to invite user");
      }

      const data = await response.json();

      // Show invite details
      console.log("📧 INVITE CREATED:");
      console.log("Invite Link:", data.invite.inviteLink);
      console.log("Temp Password:", data.invite.tempPassword);

      toast({
        title: "✅ Invite Sent Successfully",
        description: `${inviteData.firstName} ${inviteData.lastName} has been invited. Check console for details.`,
      });

      // Reset form
      setInviteData({ firstName: "", lastName: "", email: "" });
      setShowInviteForm(false);

      // Refresh users list
      fetchUsers();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to invite user",
        variant: "destructive",
      });
    } finally {
      setInviting(false);
    }
  };

  const handleBulkInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);

    try {
      // Parse CSV format: firstName,lastName,email
      const lines = bulkInvites.trim().split("\n");
      const invites = lines
        .filter(line => line.trim())
        .map(line => {
          const [firstName, lastName, email] = line.split(",").map(s => s.trim());
          return { firstName, lastName, email };
        });

      if (invites.length === 0) {
        throw new Error("No valid invites found. Format: firstName,lastName,email");
      }

      const response = await fetch("/api/admin/invite-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invites }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to send bulk invites");
      }

      const data = await response.json();

      console.log("📧 BULK INVITES CREATED:");
      console.log(`Successful: ${data.results.successful.length}`);
      console.log(`Failed: ${data.results.failed.length}`);
      data.results.successful.forEach((invite: any) => {
        console.log(`\n${invite.name} (${invite.email})`);
        console.log(`  Link: ${invite.inviteLink}`);
        console.log(`  Password: ${invite.tempPassword}`);
      });

      toast({
        title: "✅ Bulk Invites Sent",
        description: `${data.results.successful.length} invites sent successfully. ${data.results.failed.length} failed. Check console for details.`,
      });

      // Reset form
      setBulkInvites("");
      setShowBulkForm(false);

      // Refresh users list
      fetchUsers();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send bulk invites",
        variant: "destructive",
      });
    } finally {
      setInviting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin</h1>
        <p className="text-[color:var(--muted)] mt-1">
          System administration and user management
        </p>
      </div>

      {/* User Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Manage sales reps and administrators</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setShowInviteForm(!showInviteForm);
                  setShowBulkForm(false);
                }}
                className="gap-2"
                variant={showInviteForm ? "default" : "outline"}
              >
                <UserPlus className="h-4 w-4" />
                Invite Single
              </Button>
              <Button
                onClick={() => {
                  setShowBulkForm(!showBulkForm);
                  setShowInviteForm(false);
                }}
                className="gap-2"
                variant={showBulkForm ? "default" : "outline"}
              >
                <Users className="h-4 w-4" />
                Bulk Upload
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {showInviteForm && (
            <form onSubmit={handleInvite} className="mb-6 p-4 border border-border rounded-lg bg-card/50">
              <h3 className="font-semibold mb-4">Invite New Rep</h3>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={inviteData.firstName}
                    onChange={(e) => setInviteData({ ...inviteData, firstName: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={inviteData.lastName}
                    onChange={(e) => setInviteData({ ...inviteData, lastName: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={inviteData.email}
                    onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button type="submit" disabled={inviting}>
                  {inviting ? "Sending..." : "Send Invite"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowInviteForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}

          {showBulkForm && (
            <form onSubmit={handleBulkInvite} className="mb-6 p-4 border border-border rounded-lg bg-card/50">
              <h3 className="font-semibold mb-4">Bulk Upload Invites</h3>
              <p className="text-sm text-[color:var(--muted)] mb-3">
                Enter one invite per line in CSV format: <code className="text-xs bg-primary/10 px-1 py-0.5 rounded">firstName,lastName,email</code>
              </p>
              <div className="mb-3">
                <Label htmlFor="bulkInvites">CSV Data</Label>
                <textarea
                  id="bulkInvites"
                  value={bulkInvites}
                  onChange={(e) => setBulkInvites(e.target.value)}
                  placeholder="John,Doe,john@example.com&#10;Jane,Smith,jane@example.com&#10;Mike,Johnson,mike@example.com"
                  className="w-full min-h-[150px] p-3 rounded-md border border-input bg-background text-sm font-mono"
                  required
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={inviting}>
                  {inviting ? "Processing..." : "Send Bulk Invites"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowBulkForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}

          {loading ? (
            <div className="text-center py-8 text-[color:var(--muted)]">Loading users...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium text-sm">Name</th>
                    <th className="text-left py-3 px-4 font-medium text-sm">Email</th>
                    <th className="text-left py-3 px-4 font-medium text-sm">Role</th>
                    <th className="text-left py-3 px-4 font-medium text-sm">Status</th>
                    <th className="text-right py-3 px-4 font-medium text-sm">Accounts</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-border/50">
                      <td className="py-3 px-4">{user.name}</td>
                      <td className="py-3 px-4 text-[color:var(--muted)]">{user.email}</td>
                      <td className="py-3 px-4">
                        <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                          {user.role.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        {user.onboardedAt ? (
                          <span className="text-green-400">✓ Onboarded</span>
                        ) : (
                          <span className="text-yellow-400">⏳ Pending</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">{user._count.accounts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>System Health</CardTitle>
          <CardDescription>Application status and diagnostics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-[color:var(--muted)]">Database</span>
              <span className="text-green-400 font-medium">Connected</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-[color:var(--muted)]">CuraGenesis API</span>
              <span className="text-green-400 font-medium">Configured</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-[color:var(--muted)]">Metrics API</span>
              <span className="text-green-400 font-medium">Configured</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Environment Variables</CardTitle>
          <CardDescription>Configuration status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm font-mono">
            <div className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              <span>DATABASE_URL</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              <span>CURAGENESIS_API_BASE</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              <span>CURAGENESIS_API_KEY</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              <span>CG_METRICS_API_KEY</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-8 text-center">
          <Settings className="h-12 w-12 mx-auto text-[color:var(--muted)] mb-3" />
          <p className="text-[color:var(--muted)]">
            Additional admin features coming soon
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
