import { DashboardLayout } from "@/components/DashboardLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Search, Filter, UserPlus, Download, PauseCircle, PlayCircle } from "lucide-react"
import { useSubscribers } from "@/hooks/useSubscribers"
import { supabase } from "@/integrations/supabase/client"

function initialsFromEmail(email: string) {
  const [name] = email.split("@");
  return name.slice(0, 2).toUpperCase();
}

export default function Users() {
  const { subscribers, loading } = useSubscribers();

  const totalUsers = subscribers.length;
  const activeUsers = subscribers.filter(
    (s) => s.subscribed && (s.subscription_end ? new Date(s.subscription_end) > new Date() : false)
  ).length;

  const thisMonthUsers = subscribers.filter((s) => {
    const created = new Date(s.created_at);
    const now = new Date();
    return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
  }).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Users</h1>
            <p className="text-muted-foreground mt-2">Manage platform users and their activities</p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button className="bg-accent hover:bg-accent/90">
              <UserPlus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{totalUsers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{activeUsers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">New This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{thisMonthUsers}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-white">User Management</CardTitle>
                <CardDescription>View and manage all platform users</CardDescription>
              </div>
              <div className="flex space-x-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search users..." className="pl-8" />
                </div>
                <Button variant="outline">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground text-sm">Loading users…</p>
            ) : subscribers.length === 0 ? (
              <p className="text-muted-foreground text-sm">No users found.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Join Date</TableHead>
                    <TableHead>Remaining Days</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscribers.map((sub) => {
                    const remainingDays = sub.subscription_end
                      ? Math.max(
                          0,
                          Math.ceil(
                            (new Date(sub.subscription_end).getTime() - Date.now()) /
                              (1000 * 60 * 60 * 24)
                          )
                        )
                      : 0;
                    return (
                      <TableRow key={sub.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src="/placeholder.svg" alt={sub.email} />
                              <AvatarFallback>{initialsFromEmail(sub.email)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium text-white">{sub.email}</div>
                              <div className="text-sm text-muted-foreground">{sub.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={sub.subscription_tier ? "default" : "secondary"}>
                            {sub.subscription_tier ?? "—"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={sub.subscribed ? "default" : "destructive"}>
                            {sub.subscribed ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-white">
                          {new Date(sub.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {remainingDays} days
                        </TableCell>
                        <TableCell>
                          {sub.subscribed ? (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={async () => {
                                if (!confirm(`Pause subscription for ${sub.email}?`)) return;
                                const { error } = await supabase
                                  .from("subscribers")
                                  .update({ subscribed: false })
                                  .eq("id", sub.id);
                                if (error) {
                                  alert("Failed to pause: " + error.message);
                                }
                              }}
                            >
                              <PauseCircle className="h-4 w-4 mr-1" /> Pause
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                if (!confirm(`Resume subscription for ${sub.email}?`)) return;
                                const { error } = await supabase
                                  .from("subscribers")
                                  .update({ subscribed: true })
                                  .eq("id", sub.id);
                                if (error) {
                                  alert("Failed to resume: " + error.message);
                                }
                              }}
                            >
                              <PlayCircle className="h-4 w-4 mr-1" /> Resume
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
