
import { DashboardLayout } from "@/components/DashboardLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Key, Database, Bell, Shield, CreditCard } from "lucide-react"

export default function Settings() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Settings</h1>
          <p className="text-muted-foreground mt-2">Manage your platform configuration and integrations</p>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="bg-card">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-white">Platform Settings</CardTitle>
                <CardDescription>Configure your platform's basic settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="platform-name">Platform Name</Label>
                    <Input id="platform-name" defaultValue="BigShow OTT" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="support-email">Support Email</Label>
                    <Input id="support-email" defaultValue="support@bigshow.com" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="platform-description">Platform Description</Label>
                  <Textarea 
                    id="platform-description" 
                    defaultValue="India's premier OTT platform for web series and entertainment content"
                    className="min-h-[100px]"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="maintenance-mode" />
                  <Label htmlFor="maintenance-mode">Maintenance Mode</Label>
                </div>
                <Button className="bg-accent hover:bg-accent/90">Save Changes</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="integrations" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <Database className="h-5 w-5 text-accent" />
                    <CardTitle className="text-white">Bunny.net CDN</CardTitle>
                  </div>
                  <CardDescription>Video hosting and streaming configuration</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Status</span>
                    <Badge variant="default">Connected</Badge>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bunny-api-key">API Key</Label>
                    <Input id="bunny-api-key" type="password" placeholder="••••••••" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bunny-storage-zone">Storage Zone</Label>
                    <Input id="bunny-storage-zone" defaultValue="bigshow-videos" />
                  </div>
                  <Button variant="outline" className="w-full">Test Connection</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <CreditCard className="h-5 w-5 text-accent" />
                    <CardTitle className="text-white">Payment Gateways</CardTitle>
                  </div>
                  <CardDescription>Razorpay and LightSpeed integration</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Razorpay</span>
                      <Badge variant="default">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">LightSpeed Gateway</span>
                      <Badge variant="secondary">Configured</Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="razorpay-key">Razorpay Key ID</Label>
                    <Input id="razorpay-key" type="password" placeholder="••••••••" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lightspeed-key">LightSpeed API Key</Label>
                    <Input id="lightspeed-key" type="password" placeholder="••••••••" />
                  </div>
                  <Button variant="outline" className="w-full">Update Keys</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <Database className="h-5 w-5 text-accent" />
                    <CardTitle className="text-white">Database</CardTitle>
                  </div>
                  <CardDescription>Supabase database configuration</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Connection Status</span>
                    <Badge variant="default">Connected</Badge>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="supabase-url">Supabase URL</Label>
                    <Input id="supabase-url" defaultValue="https://your-project.supabase.co" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="supabase-key">Anon Key</Label>
                    <Input id="supabase-key" type="password" placeholder="••••••••" />
                  </div>
                  <Button variant="outline" className="w-full">Test Connection</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <Key className="h-5 w-5 text-accent" />
                    <CardTitle className="text-white">API Configuration</CardTitle>
                  </div>
                  <CardDescription>Webhook URLs and API endpoints</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="webhook-url">Webhook URL</Label>
                    <Input id="webhook-url" defaultValue="https://api.bigshow.com/webhooks" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="api-version">API Version</Label>
                    <Input id="api-version" defaultValue="v1.0" />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="webhook-enabled" defaultChecked />
                    <Label htmlFor="webhook-enabled">Enable Webhooks</Label>
                  </div>
                  <Button variant="outline" className="w-full">Generate New Key</Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Bell className="h-5 w-5 text-accent" />
                  <CardTitle className="text-white">Notification Settings</CardTitle>
                </div>
                <CardDescription>Configure email and system notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-white">New User Registration</Label>
                      <p className="text-sm text-muted-foreground">Get notified when new users sign up</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-white">Payment Notifications</Label>
                      <p className="text-sm text-muted-foreground">Receive alerts for successful payments</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-white">System Alerts</Label>
                      <p className="text-sm text-muted-foreground">Critical system notifications</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-white">Weekly Reports</Label>
                      <p className="text-sm text-muted-foreground">Receive weekly analytics reports</p>
                    </div>
                    <Switch />
                  </div>
                </div>
                <Button className="bg-accent hover:bg-accent/90">Save Notification Settings</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-accent" />
                  <CardTitle className="text-white">Security Settings</CardTitle>
                </div>
                <CardDescription>Manage security and access controls</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="current-password">Current Password</Label>
                    <Input id="current-password" type="password" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input id="new-password" type="password" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <Input id="confirm-password" type="password" />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-white">Two-Factor Authentication</Label>
                      <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
                    </div>
                    <Switch />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-white">Login Alerts</Label>
                      <p className="text-sm text-muted-foreground">Get notified of new login attempts</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
                <div className="flex space-x-4">
                  <Button className="bg-accent hover:bg-accent/90">Update Password</Button>
                  <Button variant="outline">Security Audit</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
