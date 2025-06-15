
import { DashboardLayout } from "@/components/DashboardLayout"
import { DashboardCard } from "@/components/DashboardCard"
import { RecentTransactions } from "@/components/RecentTransactions"
import { UsersChart } from "@/components/UsersChart"
import { Users, Calendar, Upload, ChevronUp } from "lucide-react"

const Index = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Dashboard Overview</h1>
          <p className="text-muted-foreground">Welcome back to Pitara OTT Admin Panel</p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <DashboardCard
            title="Total Users"
            value="12,458"
            subtitle="from last month"
            icon={<Users className="h-4 w-4 text-primary" />}
            trend={{ value: 12.5, isPositive: true }}
          />
          <DashboardCard
            title="Active Subscriptions"
            value="8,942"
            subtitle="from last month"
            icon={<Calendar className="h-4 w-4 text-primary" />}
            trend={{ value: 8.2, isPositive: true }}
          />
          <DashboardCard
            title="Total Revenue"
            value="₹2,48,750"
            subtitle="from last month"
            icon={<ChevronUp className="h-4 w-4 text-primary" />}
            trend={{ value: 15.3, isPositive: true }}
          />
          <DashboardCard
            title="Web Series"
            value="248"
            subtitle="total uploaded"
            icon={<Upload className="h-4 w-4 text-primary" />}
            trend={{ value: 2.1, isPositive: true }}
          />
        </div>

        {/* Charts and Tables */}
        <div className="grid gap-6 lg:grid-cols-2">
          <UsersChart />
          <RecentTransactions />
        </div>

        {/* Popular Series */}
        <div className="grid gap-6">
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="text-lg font-semibold mb-4">Most Watched Series</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[
                { title: "The Crown Chronicles", views: "2.4M", rating: "4.8" },
                { title: "Mumbai Nights", views: "1.8M", rating: "4.6" },
                { title: "Tech Titans", views: "1.5M", rating: "4.7" },
                { title: "Family Secrets", views: "1.2M", rating: "4.5" },
              ].map((series, index) => (
                <div key={index} className="flex items-center gap-3 p-3 rounded-md bg-muted/50 hover:bg-muted transition-colors">
                  <div className="w-12 h-12 bg-primary/20 rounded-md flex items-center justify-center">
                    <span className="text-primary font-bold">#{index + 1}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{series.title}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{series.views} views</span>
                      <span>•</span>
                      <span>⭐ {series.rating}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default Index
