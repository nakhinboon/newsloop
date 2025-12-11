'use client';

import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useState, useMemo } from 'react';
import { format, parseISO, subDays } from 'date-fns';

interface ViewsAreaChartProps {
  data: { date: string; views: number }[];
}

type TimeRange = '7d' | '14d' | '30d';

const TIME_RANGE_DAYS: Record<TimeRange, number> = {
  '7d': 7,
  '14d': 14,
  '30d': 30,
};

const chartConfig = {
  views: {
    label: 'Views',
    color: 'hsl(221 83% 53%)', // Blue
  },
} satisfies ChartConfig;

export function ViewsAreaChart({ data }: ViewsAreaChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');

  const filteredData = useMemo(() => {
    const now = new Date();
    const days = TIME_RANGE_DAYS[timeRange];
    const startDate = subDays(now, days);

    return data
      .map((item) => {
        const parsedDate = parseISO(item.date);
        return { ...item, parsedDate, formattedDate: format(parsedDate, 'MMM d') };
      })
      .filter((item) => item.parsedDate >= startDate);
  }, [data, timeRange]);

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Page Views</CardTitle>
          <CardDescription>No data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="pt-0">
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1">
          <CardTitle>Page Views</CardTitle>
          <CardDescription>
            Total views over the selected period
          </CardDescription>
        </div>
        <Select value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)}>
          <SelectTrigger className="w-[140px] rounded-lg" aria-label="Select time range">
            <SelectValue placeholder="Last 30 days" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="7d" className="rounded-lg">Last 7 days</SelectItem>
            <SelectItem value="14d" className="rounded-lg">Last 14 days</SelectItem>
            <SelectItem value="30d" className="rounded-lg">Last 30 days</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full" aria-label="Page views chart">
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id="fillViews" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-views)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-views)" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="formattedDate"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dot" />}
            />
            <Area
              dataKey="views"
              type="natural"
              fill="url(#fillViews)"
              stroke="var(--color-views)"
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
