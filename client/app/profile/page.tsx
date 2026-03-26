"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  UserCircle,
  Mail,
  Shield,
  Clock,
  Heart,
  Lock,
  Save,
  CalendarDays,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { updateProfile, changePassword } from "@/lib/api";

export default function ProfilePage() {
  const router = useRouter();
  const { user, isLoggedIn, isLoading, token, refreshUser } = useAuth();

  const [name, setName] = useState("");
  const [favoriteTeam, setFavoriteTeam] = useState("");
  const [timezone, setTimezone] = useState("");
  const [saving, setSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      router.push("/login");
    }
  }, [isLoading, isLoggedIn, router]);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setFavoriteTeam((user as unknown as { favorite_team?: string }).favorite_team || "");
      setTimezone((user as unknown as { timezone?: string }).timezone || "");
    }
  }, [user]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    try {
      await updateProfile(token, {
        name: name || undefined,
        favorite_team: favoriteTeam || undefined,
        timezone: timezone || undefined,
      });
      await refreshUser();
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }
    setChangingPassword(true);
    try {
      await changePassword(token, currentPassword, newPassword);
      toast.success("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Password change failed");
    } finally {
      setChangingPassword(false);
    }
  }

  if (isLoading || !user) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <Skeleton className="mb-8 h-12 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const isCredentials = (user as unknown as { auth_provider?: string }).auth_provider === "credentials";

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <PageHeader
        icon={UserCircle}
        title="Profile"
        subtitle="Manage your account settings"
      />

      {/* Account Info */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Account Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <Mail className="size-4 text-muted-foreground" />
            <span className="text-muted-foreground">Email</span>
            <span className="ml-auto font-medium">{user.email}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Shield className="size-4 text-muted-foreground" />
            <span className="text-muted-foreground">Auth provider</span>
            <span className="ml-auto font-medium capitalize">
              {(user as unknown as { auth_provider?: string }).auth_provider || user.authProvider}
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <CalendarDays className="size-4 text-muted-foreground" />
            <span className="text-muted-foreground">Member since</span>
            <span className="ml-auto font-medium">
              {new Date(
                (user as unknown as { created_at?: string }).created_at || user.createdAt,
              ).toLocaleDateString()}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Edit Profile */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Edit Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label htmlFor="name" className="mb-1.5 block text-sm font-medium">
                Name
              </label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
            </div>
            <div>
              <label htmlFor="team" className="mb-1.5 block text-sm font-medium">
                <Heart className="mr-1.5 inline size-3.5 text-muted-foreground" />
                Favorite Team (3-letter code)
              </label>
              <Input
                id="team"
                value={favoriteTeam}
                onChange={(e) => setFavoriteTeam(e.target.value.toUpperCase())}
                placeholder="e.g. RMA, BAR, LIV"
                maxLength={3}
              />
            </div>
            <div>
              <label htmlFor="tz" className="mb-1.5 block text-sm font-medium">
                <Clock className="mr-1.5 inline size-3.5 text-muted-foreground" />
                Timezone
              </label>
              <Input
                id="tz"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                placeholder="e.g. Asia/Dhaka, America/New_York"
              />
            </div>
            <Button type="submit" disabled={saving} className="gap-2">
              {saving ? <Spinner className="size-4" /> : <Save className="size-4" />}
              Save Changes
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Change Password — only for credentials users */}
      {isCredentials && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              <Lock className="mr-1.5 inline size-4" />
              Change Password
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label
                  htmlFor="current-pw"
                  className="mb-1.5 block text-sm font-medium"
                >
                  Current Password
                </label>
                <Input
                  id="current-pw"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="new-pw"
                  className="mb-1.5 block text-sm font-medium"
                >
                  New Password
                </label>
                <Input
                  id="new-pw"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  minLength={8}
                  required
                />
              </div>
              <Button
                type="submit"
                variant="outline"
                disabled={changingPassword}
                className="gap-2"
              >
                {changingPassword ? (
                  <Spinner className="size-4" />
                ) : (
                  <Lock className="size-4" />
                )}
                Change Password
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
