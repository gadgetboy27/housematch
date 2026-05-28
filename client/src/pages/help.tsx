import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Mail, HelpCircle, MessageSquare, Shield, FileText, Users } from "lucide-react";
import { Link } from "wouter";

const SUPPORT_EMAIL = "support@housematch.co.nz";

const contactFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  subject: z.string().min(5, "Subject must be at least 5 characters"),
  message: z.string().min(20, "Message must be at least 20 characters")
});

type ContactFormData = z.infer<typeof contactFormSchema>;

export default function HelpPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: "",
      email: "",
      subject: "",
      message: ""
    }
  });

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true);
    try {
      await apiRequest("POST", "/api/support/contact", data);

      toast({
        title: "Message sent!",
        description: "We'll get back to you within 24-48 hours.",
      });

      form.reset();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to send message",
        description: error.message || "Please try again or email us directly."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Support Contact
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            We're here to help with any questions or issues
          </p>
        </div>

        {/* Quick Contact Card */}
        <Card className="mb-6 border-2 border-indigo-100 dark:border-indigo-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-indigo-600" />
              Direct Support Email
            </CardTitle>
            <CardDescription>
              Get in touch directly - we typically respond within 24-48 hours
            </CardDescription>
          </CardHeader>
          <CardContent>
            <a 
              href={`mailto:${SUPPORT_EMAIL}`}
              className="inline-flex items-center gap-2 text-lg font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
              data-testid="link-support-email"
            >
              <Mail className="h-4 w-4" />
              {SUPPORT_EMAIL}
            </a>
          </CardContent>
        </Card>

        {/* Common Questions */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-indigo-600" />
              Common Questions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-1 flex items-center gap-2">
                <Shield className="h-4 w-4 text-indigo-600" />
                How secure is my property listing?
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                We use industry-standard encryption and security measures. Your data is stored securely and never shared without your permission.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-1 flex items-center gap-2">
                <FileText className="h-4 w-4 text-indigo-600" />
                What reports are available?
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                We offer Title Searches, LIM reports, and PIM reports through official providers. Check our <Link href="/reports" className="text-indigo-600 hover:underline">Reports page</Link> for details.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-1 flex items-center gap-2">
                <Users className="h-4 w-4 text-indigo-600" />
                How do I become a service partner?
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Visit our <Link href="/partner/signup" className="text-indigo-600 hover:underline">Partner Signup</Link> page to apply. We work with lawyers, conveyancers, mortgage brokers, and home service providers.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Contact Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-indigo-600" />
              Send Us a Message
            </CardTitle>
            <CardDescription>
              Fill out the form below and we'll get back to you as soon as possible
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Your name" 
                          {...field} 
                          data-testid="input-contact-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="your.email@example.com" 
                          {...field}
                          data-testid="input-contact-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="What do you need help with?" 
                          {...field}
                          data-testid="input-contact-subject"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Message</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Please provide details about your question or issue..."
                          rows={6}
                          {...field}
                          data-testid="input-contact-message"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isSubmitting}
                  data-testid="button-submit-contact"
                >
                  {isSubmitting ? "Sending..." : "Send Message"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Back Link */}
        <div className="text-center mt-6">
          <Link href="/" className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 text-sm">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
