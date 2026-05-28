import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeftRight, MapPin, Home, Search, Trash2, Eye, Star, RefreshCw, Plus, Target, Zap } from "lucide-react";
import type { LifestyleScout } from "@shared/schema";

const scoutFormSchema = z.object({
  currentSuburb: z.string().min(1, "Enter your current suburb"),
  currentCity: z.string().min(1, "Enter your current city"),
  currentPropertyType: z.string().min(1, "Select property type"),
  currentBedrooms: z.coerce.number().optional(),
  estimatedValue: z.string().optional(),
  targetSuburb: z.string().min(1, "Enter target suburb"),
  targetCity: z.string().min(1, "Enter target city"),
  targetPropertyType: z.string().min(1, "Select target property type"),
  targetBedrooms: z.coerce.number().optional(),
  maxTopUp: z.string().optional(),
  moveByDate: z.string().optional(),
  transitionType: z.string().min(1, "Select transition type"),
  additionalNotes: z.string().optional(),
  notifyEmail: z.boolean().default(true),
});

type ScoutFormValues = z.infer<typeof scoutFormSchema>;

const TRANSITION_TYPES = [
  { value: "city_to_rural", label: "City to Rural / Lifestyle" },
  { value: "rural_to_city", label: "Rural / Lifestyle to City" },
  { value: "upsizing", label: "Upsizing" },
  { value: "downsizing", label: "Downsizing" },
  { value: "coastal", label: "Moving to the Coast" },
  { value: "lifestyle_change", label: "General Lifestyle Change" },
];

const PROPERTY_TYPES = [
  { value: "residential", label: "Residential Home" },
  { value: "lifestyle", label: "Lifestyle Block" },
  { value: "rural", label: "Rural / Farm" },
  { value: "apartment", label: "Apartment / Unit" },
  { value: "townhouse", label: "Townhouse" },
];

const MATCH_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  direct_swap: { label: "Direct Swap", color: "bg-purple-500" },
  lifestyle_match: { label: "Listing Match", color: "bg-blue-500" },
  partial_match: { label: "Partial Match", color: "bg-yellow-500" },
};

function ScoutMatchCard({ match }: { match: any }) {
  const matchInfo = MATCH_TYPE_LABELS[match.match.matchType] || { label: match.match.matchType, color: "bg-gray-500" };
  const isDirectSwap = match.match.matchType === "direct_swap";

  return (
    <Card className="border border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className={`text-xs text-white px-2 py-0.5 rounded-full font-medium ${matchInfo.color}`}>
                {matchInfo.label}
              </span>
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                <span className="text-xs text-white/70">{match.match.matchScore}% match</span>
              </div>
            </div>

            {isDirectSwap && match.matchedScout ? (
              <div>
                <p className="text-white font-medium text-sm">
                  Lifestyle Swap Candidate
                </p>
                <p className="text-white/60 text-xs mt-1">
                  They have: {match.matchedScout.currentBedrooms}bed {match.matchedScout.currentPropertyType} in {match.matchedScout.currentSuburb}, {match.matchedScout.currentCity}
                </p>
                <p className="text-white/60 text-xs">
                  They want: {match.matchedScout.targetSuburb}, {match.matchedScout.targetCity}
                </p>
              </div>
            ) : match.property ? (
              <div>
                <p className="text-white font-medium text-sm truncate">{match.property.title}</p>
                <p className="text-white/60 text-xs mt-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {match.property.suburb}, {match.property.city}
                </p>
                {match.property.bedrooms && (
                  <p className="text-white/60 text-xs">{match.property.bedrooms} beds · {match.property.propertyType}</p>
                )}
                {match.property.price && (
                  <p className="text-green-400 text-sm font-semibold mt-1">{match.property.price}</p>
                )}
              </div>
            ) : (
              <p className="text-white/40 text-sm">Match details loading...</p>
            )}

            {match.match.matchReason && (
              <p className="text-white/40 text-xs mt-2 italic">Why: {match.match.matchReason}</p>
            )}
          </div>

          <div className="text-right shrink-0">
            <div className={`text-lg font-bold ${match.match.matchScore >= 80 ? "text-green-400" : match.match.matchScore >= 65 ? "text-yellow-400" : "text-white/50"}`}>
              {match.match.matchScore}
            </div>
            <div className="text-white/40 text-xs">score</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ScoutCard({ scout, onDelete }: { scout: LifestyleScout; onDelete: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const { data: matches = [] } = useQuery({
    queryKey: ["/api/scout", scout.id, "matches"],
    queryFn: async () => {
      const res = await fetch(`/api/scout/${scout.id}/matches`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch matches");
      return res.json();
    },
    enabled: expanded,
  });

  const transition = TRANSITION_TYPES.find(t => t.value === scout.transitionType);

  return (
    <Card className="border border-white/10 bg-white/5">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-2 h-2 rounded-full ${scout.status === "active" ? "bg-green-400 animate-pulse" : "bg-gray-400"}`} />
              <span className="text-white font-semibold text-base">Scout Active</span>
            </div>
            {transition && (
              <span className="text-xs text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded-full">{transition.label}</span>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-white/40 hover:text-red-400 hover:bg-red-400/10 shrink-0"
            onClick={() => onDelete(scout.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-white/5 rounded-lg p-3">
            <p className="text-white/40 text-xs mb-1 flex items-center gap-1"><Home className="w-3 h-3" /> I Have</p>
            <p className="text-white font-medium text-sm">{scout.currentSuburb}, {scout.currentCity}</p>
            <p className="text-white/60 text-xs">{scout.currentBedrooms}bed {scout.currentPropertyType}</p>
            {scout.estimatedValue && <p className="text-green-400 text-xs mt-1">{scout.estimatedValue}</p>}
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <p className="text-white/40 text-xs mb-1 flex items-center gap-1"><Target className="w-3 h-3" /> I Want</p>
            <p className="text-white font-medium text-sm">{scout.targetSuburb}, {scout.targetCity}</p>
            <p className="text-white/60 text-xs">{scout.targetBedrooms}bed {scout.targetPropertyType}</p>
            {scout.maxTopUp && <p className="text-blue-400 text-xs mt-1">Top-up: {scout.maxTopUp}</p>}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            <span className="text-white/60 text-sm">
              {scout.matchCount || 0} match{scout.matchCount !== 1 ? "es" : ""} found
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-white/60 hover:text-white text-xs"
            onClick={() => setExpanded(!expanded)}
          >
            <Eye className="w-3 h-3 mr-1" />
            {expanded ? "Hide" : "View"} Matches
          </Button>
        </div>

        {expanded && (
          <div className="mt-4 space-y-3">
            {matches.length === 0 ? (
              <div className="text-center py-6">
                <Search className="w-8 h-8 text-white/20 mx-auto mb-2" />
                <p className="text-white/40 text-sm">No matches yet — your scout is scanning...</p>
                <p className="text-white/30 text-xs mt-1">We'll notify you when a match is found</p>
              </div>
            ) : (
              matches.map((match: any) => <ScoutMatchCard key={match.match.id} match={match} />)
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ScoutPage() {
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: scouts = [], isLoading } = useQuery<LifestyleScout[]>({
    queryKey: ["/api/scout"],
  });

  const form = useForm<ScoutFormValues>({
    resolver: zodResolver(scoutFormSchema),
    defaultValues: {
      currentSuburb: "",
      currentCity: "",
      currentPropertyType: "",
      targetSuburb: "",
      targetCity: "",
      targetPropertyType: "",
      transitionType: "",
      notifyEmail: true,
    },
  });

  const createScout = useMutation({
    mutationFn: (data: ScoutFormValues) => apiRequest("POST", "/api/scout", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scout"] });
      setShowForm(false);
      form.reset();
      toast({ title: "Scout deployed!", description: "Your AI scout is now scanning for matches." });
    },
    onError: (err: any) => {
      toast({ title: "Failed to create scout", description: err.message, variant: "destructive" });
    },
  });

  const deleteScout = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/scout/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scout"] });
      toast({ title: "Scout removed" });
    },
  });

  const onSubmit = (data: ScoutFormValues) => createScout.mutate(data);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-950 to-gray-900">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 mb-4 shadow-lg shadow-purple-500/30">
            <ArrowLeftRight className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Lifestyle Scout</h1>
          <p className="text-white/60 text-sm max-w-md mx-auto">
            Tell us what you have and what you want. Your AI scout works 24/7 to find your perfect match — so you never have to move twice.
          </p>
        </div>

        {/* Pain Point Banner */}
        <Card className="border border-purple-500/30 bg-purple-500/10 mb-6">
          <CardContent className="p-4">
            <p className="text-purple-200 text-sm text-center">
              <strong className="text-white">The NZ paradox:</strong> Selling means renting in between. We solve that by matching you with someone whose move is the mirror image of yours.
            </p>
          </CardContent>
        </Card>

        {/* Scouts List */}
        {isLoading ? (
          <div className="text-center py-10 text-white/40">Scanning for your scouts...</div>
        ) : scouts.length > 0 ? (
          <div className="space-y-4 mb-6">
            {scouts.map((scout) => (
              <ScoutCard key={scout.id} scout={scout} onDelete={(id) => deleteScout.mutate(id)} />
            ))}
          </div>
        ) : !showForm ? (
          <Card className="border border-dashed border-white/20 bg-white/3 mb-6">
            <CardContent className="py-12 text-center">
              <Search className="w-12 h-12 text-white/20 mx-auto mb-3" />
              <p className="text-white/50 text-sm mb-1">No scouts deployed yet</p>
              <p className="text-white/30 text-xs">Your scout will scan listings and find lifestyle swap partners</p>
            </CardContent>
          </Card>
        ) : null}

        {/* Deploy Scout Button */}
        {!showForm && (
          <Button
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold py-3 rounded-xl shadow-lg shadow-purple-500/30"
            onClick={() => setShowForm(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Deploy My Scout
          </Button>
        )}

        {/* Scout Form */}
        {showForm && (
          <Card className="border border-white/10 bg-white/5 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-white text-lg">Set Up Your Scout</CardTitle>
              <CardDescription className="text-white/50 text-sm">
                Tell us about your current home and your dream home. We'll find your match.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  {/* Transition Type */}
                  <FormField control={form.control} name="transitionType" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80 text-sm">What type of move is this?</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-white/10 border-white/20 text-white">
                            <SelectValue placeholder="Select your transition..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TRANSITION_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {/* Current Home */}
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-4">
                    <p className="text-white/70 text-sm font-medium flex items-center gap-2"><Home className="w-4 h-4 text-purple-400" /> My Current Home</p>
                    <div className="grid grid-cols-2 gap-3">
                      <FormField control={form.control} name="currentSuburb" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white/60 text-xs">Suburb</FormLabel>
                          <FormControl><Input {...field} placeholder="e.g. Ponsonby" className="bg-white/10 border-white/20 text-white placeholder:text-white/30 text-sm" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="currentCity" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white/60 text-xs">City</FormLabel>
                          <FormControl><Input {...field} placeholder="e.g. Auckland" className="bg-white/10 border-white/20 text-white placeholder:text-white/30 text-sm" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <FormField control={form.control} name="currentPropertyType" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white/60 text-xs">Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-white/10 border-white/20 text-white text-sm">
                                <SelectValue placeholder="Type..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {PROPERTY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="currentBedrooms" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white/60 text-xs">Bedrooms</FormLabel>
                          <FormControl><Input {...field} type="number" min={1} placeholder="3" className="bg-white/10 border-white/20 text-white placeholder:text-white/30 text-sm" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <FormField control={form.control} name="estimatedValue" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white/60 text-xs">Estimated Value (optional)</FormLabel>
                        <FormControl><Input {...field} placeholder="e.g. $850,000" className="bg-white/10 border-white/20 text-white placeholder:text-white/30 text-sm" /></FormControl>
                      </FormItem>
                    )} />
                  </div>

                  {/* Target Home */}
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-4">
                    <p className="text-white/70 text-sm font-medium flex items-center gap-2"><Target className="w-4 h-4 text-pink-400" /> My Dream Home</p>
                    <div className="grid grid-cols-2 gap-3">
                      <FormField control={form.control} name="targetSuburb" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white/60 text-xs">Target Suburb</FormLabel>
                          <FormControl><Input {...field} placeholder="e.g. Matakana" className="bg-white/10 border-white/20 text-white placeholder:text-white/30 text-sm" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="targetCity" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white/60 text-xs">Target City/Region</FormLabel>
                          <FormControl><Input {...field} placeholder="e.g. Rodney" className="bg-white/10 border-white/20 text-white placeholder:text-white/30 text-sm" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <FormField control={form.control} name="targetPropertyType" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white/60 text-xs">Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-white/10 border-white/20 text-white text-sm">
                                <SelectValue placeholder="Type..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {PROPERTY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="targetBedrooms" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white/60 text-xs">Bedrooms</FormLabel>
                          <FormControl><Input {...field} type="number" min={1} placeholder="4" className="bg-white/10 border-white/20 text-white placeholder:text-white/30 text-sm" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <FormField control={form.control} name="maxTopUp" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white/60 text-xs">Max top-up cash (optional)</FormLabel>
                          <FormControl><Input {...field} placeholder="e.g. $200,000" className="bg-white/10 border-white/20 text-white placeholder:text-white/30 text-sm" /></FormControl>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="moveByDate" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white/60 text-xs">Move-by date (optional)</FormLabel>
                          <FormControl><Input {...field} placeholder="e.g. July 2026" className="bg-white/10 border-white/20 text-white placeholder:text-white/30 text-sm" /></FormControl>
                        </FormItem>
                      )} />
                    </div>
                  </div>

                  {/* Notes */}
                  <FormField control={form.control} name="additionalNotes" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/60 text-xs">Anything else? (optional)</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="e.g. Need a double garage, school zone, rural internet..." className="bg-white/10 border-white/20 text-white placeholder:text-white/30 text-sm min-h-[70px]" />
                      </FormControl>
                    </FormItem>
                  )} />

                  <div className="flex gap-3">
                    <Button type="button" variant="ghost" className="flex-1 text-white/60 border border-white/20 hover:bg-white/10" onClick={() => setShowForm(false)}>
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createScout.isPending}
                      className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold"
                    >
                      {createScout.isPending ? (
                        <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Deploying...</>
                      ) : (
                        <><Zap className="w-4 h-4 mr-2" />Deploy Scout</>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
