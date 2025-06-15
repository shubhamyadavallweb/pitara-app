import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Loader2, Star, Trash2 } from "lucide-react";

interface PaymentProvider {
  id: string;
  name: string;
  type: string;
  api_key: string;
  api_secret: string;
  salt: string | null;
  webhook_secret: string | null;
  is_primary: boolean;
  is_active: boolean;
  created_at: string;
}

export default function PaymentProviders() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<PaymentProvider>>({
    name: "",
    type: "razorpay",
    api_key: "",
    api_secret: "",
    salt: "",
    webhook_secret: "",
    is_active: true,
  });

  const { data, isLoading } = useQuery<PaymentProvider[]>({
    queryKey: ["payment_providers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_providers")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as PaymentProvider[];
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (values: Partial<PaymentProvider>) => {
      const { error } = await supabase.from("payment_providers").upsert(values, {
        onConflict: "id",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Saved", description: "Gateway saved successfully" });
      queryClient.invalidateQueries({ queryKey: ["payment_providers"] });
      setOpen(false);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const setPrimaryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("set_primary_provider", { p_target: id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Primary updated" });
      queryClient.invalidateQueries({ queryKey: ["payment_providers"] });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async (provider: PaymentProvider) => {
      const { error } = await supabase
        .from("payment_providers")
        .update({ is_active: !provider.is_active })
        .eq("id", provider.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["payment_providers"] }),
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-full">
          <Loader2 className="animate-spin h-8 w-8" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-white">Payment Providers</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Add Provider</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{form.id ? "Edit Provider" : "Add Provider"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {[
                ["Name", "name", "text"],
                ["Type (e.g., razorpay)", "type", "text"],
                ["API Key", "api_key", "password"],
                ["API Secret", "api_secret", "password"],
                ["Salt", "salt", "text"],
                ["Webhook Secret", "webhook_secret", "text"],
              ].map(([label, field, type]) => (
                <div className="space-y-2" key={field as string}>
                  <Label>{label}</Label>
                  <Input
                    type={type as string}
                    value={(form as any)[field as string] || ""}
                    onChange={(e) => setForm({ ...form, [field as string]: e.target.value })}
                  />
                </div>
              ))}
              <div className="flex items-center space-x-2">
                <Switch
                  checked={form.is_active ?? true}
                  onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
                />
                <span>Active</span>
              </div>
            </div>
            <Button onClick={() => upsertMutation.mutate(form)}>Save</Button>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {data?.map((provider) => (
          <Card key={provider.id} className="bg-card/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                {provider.name}
                {provider.is_primary && <Star className="h-4 w-4 text-yellow-400" />}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-4 text-sm">
                <span className="text-muted-foreground">Type:</span>
                <span>{provider.type}</span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-muted-foreground">Status:</span>
                <span>{provider.is_active ? "Active" : "Inactive"}</span>
              </div>
              <div className="flex gap-4 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toggleActiveMutation.mutate(provider)}
                >
                  {provider.is_active ? "Deactivate" : "Activate"}
                </Button>
                {!provider.is_primary && (
                  <Button
                    size="sm"
                    onClick={() => setPrimaryMutation.mutate(provider.id)}
                  >
                    Set Primary
                  </Button>
                )}
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={async () => {
                    if (confirm("Delete this provider?")) {
                      const { error } = await supabase
                        .from("payment_providers")
                        .delete()
                        .eq("id", provider.id);
                      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
                      else queryClient.invalidateQueries({ queryKey: ["payment_providers"] });
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </DashboardLayout>
  );
} 