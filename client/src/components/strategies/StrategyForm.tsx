import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertStrategySchema, Strategy } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const formSchema = insertStrategySchema.extend({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  description: z.string().min(1, "Description is required").max(500, "Description too long"),
});

type FormData = z.infer<typeof formSchema>;

interface StrategyFormProps {
  strategy?: Strategy;
  onSubmit: (data: FormData) => Promise<void>;
  onCancel: () => void;
  isPending?: boolean;
}

export default function StrategyForm({ 
  strategy, 
  onSubmit, 
  onCancel,
  isPending 
}: StrategyFormProps) {
  const isEdit = !!strategy;

  const getDefaultValues = (s?: Strategy): FormData => ({
    name: s?.name ?? "",
    description: s?.description ?? "",
    type: s?.type ?? "momentum",
    status: s?.status ?? "inactive",
    performance: s?.performance ?? 0,
    sharpeRatio: s?.sharpeRatio ?? 0,
    maxDrawdown: s?.maxDrawdown ?? 0,
    winRate: s?.winRate ?? 0,
    totalTrades: s?.totalTrades ?? 0,
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: getDefaultValues(strategy),
  });

  useEffect(() => {
    form.reset(getDefaultValues(strategy));
  }, [strategy?.id]);

  const handleSubmit = async (data: FormData) => {
    await onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-text-primary">Strategy Name</FormLabel>
              <FormControl>
                <Input 
                  placeholder="e.g., Moving Average Crossover" 
                  className="bg-background border-border text-text-primary"
                  data-testid="input-strategy-name"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-text-primary">Description</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Describe your trading strategy..."
                  className="bg-background border-border text-text-primary min-h-[80px]"
                  data-testid="input-strategy-description"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-text-primary">Strategy Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger 
                    className="bg-background border-border text-text-primary"
                    data-testid="select-strategy-type"
                  >
                    <SelectValue placeholder="Select strategy type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="bg-surface border-border">
                  <SelectItem value="momentum">Momentum</SelectItem>
                  <SelectItem value="mean_reversion">Mean Reversion</SelectItem>
                  <SelectItem value="trend_following">Trend Following</SelectItem>
                  <SelectItem value="arbitrage">Arbitrage</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-text-primary">Initial Status</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger 
                    className="bg-background border-border text-text-primary"
                    data-testid="select-strategy-status"
                  >
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="bg-surface border-border">
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2 pt-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            className="bg-background border-border hover:bg-border"
            data-testid="button-cancel"
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={isPending}
            className="bg-primary hover:bg-primary/90 text-white"
            data-testid="button-submit-strategy"
          >
            {isPending ? "Saving..." : isEdit ? "Update Strategy" : "Create Strategy"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
