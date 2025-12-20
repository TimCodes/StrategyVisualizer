import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TradingService } from "@/services/tradingServices";

const formSchema = z.object({
  strategyId: z.string().min(1, "Strategy is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  initialCapital: z.number().min(100, "Minimum capital is $100"),
  symbol: z.string().min(1, "Symbol is required"),
}).refine((data) => {
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  return end > start;
}, {
  message: "End date must be after start date",
  path: ["endDate"],
});

type FormData = z.infer<typeof formSchema>;

interface BacktestFormProps {
  onSubmit: (data: FormData) => Promise<void>;
  onCancel: () => void;
  isPending?: boolean;
}

const COMMON_SYMBOLS = ["BTC", "ETH", "SOL", "AAPL", "GOOGL", "MSFT", "SPY"];

export default function BacktestForm({ onSubmit, onCancel, isPending }: BacktestFormProps) {
  const { data: strategies } = useQuery({
    queryKey: ["strategies"],
    queryFn: TradingService.getStrategies,
  });

  const today = new Date();
  const oneYearAgo = new Date(today);
  oneYearAgo.setFullYear(today.getFullYear() - 1);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      strategyId: "",
      startDate: oneYearAgo.toISOString().split("T")[0],
      endDate: today.toISOString().split("T")[0],
      initialCapital: 10000,
      symbol: "BTC",
    },
  });

  useEffect(() => {
    if (strategies && strategies.length > 0 && !form.getValues("strategyId")) {
      form.setValue("strategyId", strategies[0].id);
    }
  }, [strategies]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="strategyId"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-text-primary">Strategy</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger
                    className="bg-background border-border text-text-primary"
                    data-testid="select-backtest-strategy"
                  >
                    <SelectValue placeholder="Select strategy" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="bg-surface border-border">
                  {(strategies || []).map((strategy) => (
                    <SelectItem key={strategy.id} value={strategy.id}>
                      {strategy.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="symbol"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-text-primary">Trading Symbol</FormLabel>
              <FormControl>
                <div className="space-y-2">
                  <Input
                    placeholder="e.g., BTC, ETH, AAPL"
                    className="bg-background border-border text-text-primary"
                    data-testid="input-backtest-symbol"
                    {...field}
                  />
                  <div className="flex flex-wrap gap-1">
                    {COMMON_SYMBOLS.map((sym) => (
                      <Button
                        key={sym}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-xs bg-background border-border hover:bg-border"
                        onClick={() => form.setValue("symbol", sym)}
                        data-testid={`button-symbol-${sym.toLowerCase()}`}
                      >
                        {sym}
                      </Button>
                    ))}
                  </div>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-text-primary">Start Date</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    className="bg-background border-border text-text-primary"
                    data-testid="input-backtest-start-date"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-text-primary">End Date</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    className="bg-background border-border text-text-primary"
                    data-testid="input-backtest-end-date"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="initialCapital"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-text-primary">Initial Capital ($)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="100"
                  min="100"
                  placeholder="10000"
                  className="bg-background border-border text-text-primary"
                  data-testid="input-backtest-capital"
                  {...field}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                />
              </FormControl>
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
            data-testid="button-cancel-backtest"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isPending}
            className="bg-primary hover:bg-primary/90 text-white"
            data-testid="button-run-backtest"
          >
            {isPending ? "Running..." : "Run Backtest"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
