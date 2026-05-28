import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { UserPlus, Copy, CheckCircle2 } from "lucide-react";

const inviteAdminSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Valid email is required"),
  temporaryPassword: z.string().min(8, "Password must be at least 8 characters"),
});

type InviteAdminFormData = z.infer<typeof inviteAdminSchema>;

export function InviteAdminDialog() {
  const [open, setOpen] = useState(false);
  const [inviteResult, setInviteResult] = useState<{
    email: string;
    password: string;
  } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<InviteAdminFormData>({
    resolver: zodResolver(inviteAdminSchema),
    defaultValues: {
      name: "",
      email: "",
      temporaryPassword: "",
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async (data: InviteAdminFormData) => {
      const response = await apiRequest("POST", "/api/admin/invite", data);
      return response.json();
    },
    onSuccess: (data) => {
      setInviteResult({
        email: data.email,
        password: data.temporaryPassword,
      });
      toast({
        title: "Admin Invited",
        description: "Admin account created successfully. Share the credentials below.",
      });
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Invite Failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InviteAdminFormData) => {
    inviteMutation.mutate(data);
  };

  const generatePassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    form.setValue("temporaryPassword", password);
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
    toast({
      title: "Copied!",
      description: `${field} copied to clipboard`,
    });
  };

  const handleClose = () => {
    setOpen(false);
    setInviteResult(null);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2" data-testid="button-invite-admin">
          <UserPlus className="w-4 h-4" />
          Invite Admin
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Admin User</DialogTitle>
          <DialogDescription>
            Create a new admin account. You'll receive credentials to share with the new admin.
          </DialogDescription>
        </DialogHeader>

        {inviteResult ? (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-800 mb-3">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-semibold">Admin Account Created!</span>
              </div>
              <p className="text-sm text-green-700 mb-4">
                Share these credentials with the new admin. They won't be shown again.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={inviteResult.email}
                      readOnly
                      className="flex-1 px-3 py-2 border rounded-lg bg-gray-50 text-sm"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(inviteResult.email, "Email")}
                    >
                      {copiedField === "Email" ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Temporary Password
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={inviteResult.password}
                      readOnly
                      className="flex-1 px-3 py-2 border rounded-lg bg-gray-50 text-sm font-mono"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(inviteResult.password, "Password")}
                    >
                      {copiedField === "Password" ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button onClick={handleClose} data-testid="button-close-invite">
                Close
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                {...form.register("name")}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 ${
                  form.formState.errors.name ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="Admin Name"
                data-testid="input-invite-name"
              />
              {form.formState.errors.name && (
                <p className="text-sm text-red-600 mt-1">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                {...form.register("email")}
                type="email"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 ${
                  form.formState.errors.email ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="admin@example.com"
                data-testid="input-invite-email"
              />
              {form.formState.errors.email && (
                <p className="text-sm text-red-600 mt-1">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Temporary Password
              </label>
              <div className="flex gap-2">
                <input
                  {...form.register("temporaryPassword")}
                  type="text"
                  className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 ${
                    form.formState.errors.temporaryPassword
                      ? "border-red-500"
                      : "border-gray-300"
                  }`}
                  placeholder="Min 8 characters"
                  data-testid="input-invite-password"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={generatePassword}
                  data-testid="button-generate-password"
                >
                  Generate
                </Button>
              </div>
              {form.formState.errors.temporaryPassword && (
                <p className="text-sm text-red-600 mt-1">
                  {form.formState.errors.temporaryPassword.message}
                </p>
              )}
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={inviteMutation.isPending}
                data-testid="button-submit-invite"
              >
                {inviteMutation.isPending ? "Creating..." : "Create Admin"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
