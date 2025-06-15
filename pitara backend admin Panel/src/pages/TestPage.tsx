
import { DashboardLayout } from "@/components/DashboardLayout"

const TestPage = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Test Page</h1>
          <p className="text-muted-foreground">This is a test page to verify routing works</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <p>If you can see this page, the routing is working correctly.</p>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default TestPage
