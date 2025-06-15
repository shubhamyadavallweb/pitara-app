import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { usePaymentMonitor } from "@/hooks/usePaymentMonitor"

export function RecentTransactions() {
  const { payments, loading } = usePaymentMonitor(20);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Recent Transactions</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground text-sm">Loading transactions…</p>
        ) : payments.length === 0 ? (
          <p className="text-muted-foreground text-sm">No transactions yet.</p>
        ) : (
          <div className="space-y-4">
            {payments.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium text-foreground">{transaction.user_email}</p>
                      <p className="text-sm text-muted-foreground">{transaction.plan_id}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-semibold text-foreground">
                      ₹{(transaction.amount ?? 0) / 100}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(transaction.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {transaction.payment_method && (
                    <Badge
                      variant={transaction.payment_method === "Razorpay" ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {transaction.payment_method}
                    </Badge>
                  )}
                  <Badge
                    variant={transaction.status === "paid" ? "default" : "secondary"}
                    className={cn(
                      "text-xs",
                      transaction.status === "paid"
                        ? "bg-green-500/20 text-green-400"
                        : "bg-yellow-500/20 text-yellow-400"
                    )}
                  >
                    {transaction.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
