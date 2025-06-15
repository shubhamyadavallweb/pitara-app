import { DashboardLayout } from "@/components/DashboardLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Filter, Download } from "lucide-react"
import { useSubscribers } from "@/hooks/useSubscribers"
import { usePaymentMonitor } from "@/hooks/usePaymentMonitor"

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

export default function Subscriptions() {
  const { subscribers, loading } = useSubscribers();
  const { payments } = usePaymentMonitor();

  const totalSubscriptions = subscribers.length;
  const activeSubs = subscribers.filter(
    (s) => s.subscribed && (s.subscription_end ? new Date(s.subscription_end) > new Date() : false)
  ).length;

  // Monthly revenue – sum of paid payments in current month
  const monthlyRevenue = payments
    .filter((p) => {
      if (p.status !== "paid") return false;
      const created = new Date(p.created_at);
      const now = new Date();
      return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
    })
    .reduce((acc, p) => acc + p.amount, 0) / 100; // convert to rupees

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Subscriptions</h1>
            <p className="text-muted-foreground mt-2">Manage user subscriptions and billing</p>
          </div>
          <Button className="bg-accent hover:bg-accent/90">
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Subscriptions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{totalSubscriptions}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{activeSubs}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{formatCurrency(monthlyRevenue)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Churn Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">—</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-white">Subscription Details</CardTitle>
                <CardDescription>View and manage all user subscriptions</CardDescription>
              </div>
              <div className="flex space-x-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search subscriptions..." className="pl-8" />
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
              <p className="text-muted-foreground text-sm">Loading subscriptions…</p>
            ) : subscribers.length === 0 ? (
              <p className="text-muted-foreground text-sm">No subscriptions found.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Next Billing</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscribers.map((sub) => {
                    const nextBilling = sub.subscription_end ? new Date(sub.subscription_end).toLocaleDateString() : "—";
                    return (
                      <TableRow key={sub.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium text-white">{sub.email}</div>
                            <div className="text-sm text-muted-foreground">{sub.email}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-white">{sub.subscription_tier ?? "—"}</TableCell>
                        <TableCell className="font-medium text-white">—</TableCell>
                        <TableCell>—</TableCell>
                        <TableCell>
                          <Badge variant={sub.subscribed ? "default" : "destructive"}>
                            {sub.subscribed ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-white">{nextBilling}</TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">View</Button>
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
