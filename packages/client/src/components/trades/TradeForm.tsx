import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { insertTradeSchema, Strategy } from "@shared/schema";
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

const formSchema = insertTradeSchema.extend({
  symbol: z.string().min(1, "Symbol is required").max(20, "Symbol too long"),
  quantity: z.number().min(0.0001, "Quantity must be positive"),
  price: z.number().min(0.01, "Price must be positive"),
});

type FormData = z.infer<typeof formSchema>;

interface TradeFormProps {
  onSubmit: (data: FormData) => Promise<void>;
  onCancel: () => void;
  isPending?: boolean;
}

const COMMON_SYMBOLS = ["BTC", "ETH", "SOL", "AAPL", "GOOGL", "MSFT", "TSLA", "AMZN"];

export default function TradeForm({ onSubmit, onCancel, isPending }: TradeFormProps) {
  const { data: strategies } = useQuery({
    queryKey: ["strategies"],
    queryFn: TradingService.getStrategies,
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      symbol: "",
      type: "buy",
      quantity: 0,
      price: 0,
      strategyId: "",
    },
  });

  useEffect(() => {
    if (strategies && strategies.length > 0) {
      form.setValue("strategyId", strategies[0].id);
    }
  }, [strategies]);

  const handleSubmit = async (data: FormData) => {
    await onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="symbol"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-text-primary">Symbol</FormLabel>
              <FormControl>
                <div className="space-y-2">
                  <Input
                    placeholder="e.g., BTC, ETH, AAPL"
                    className="bg-background border-border text-text-primary"
                    data-testid="input-trade-symbol"
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

        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-text-primary">Trade Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger
                    className="bg-background border-border text-text-primary"
                    data-testid="select-trade-type"
                  >
                    <SelectValue placeholder="Select trade type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="bg-surface border-border">
                  <SelectItem value="buy">Buy</SelectItem>
                  <SelectItem value="sell">Sell</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-text-primary">Quantity</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.0001"
                    placeholder="0.00"
                    className="bg-background border-border text-text-primary"
                    data-testid="input-trade-quantity"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-text-primary">Price</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="bg-background border-border text-text-primary"
                    data-testid="input-trade-price"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="strategyId"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-text-primary">Strategy</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger
                    className="bg-background border-border text-text-primary"
                    data-testid="select-trade-strategy"
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

        <div className="flex justify-end space-x-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="bg-background border-border hover:bg-border"
            data-testid="button-cancel-trade"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isPending}
            className="bg-primary hover:bg-primary/90 text-white"
            data-testid="button-submit-trade"
          >
            {isPending ? "Logging..." : "Log Trade"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
