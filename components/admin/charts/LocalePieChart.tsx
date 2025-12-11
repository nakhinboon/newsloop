'use client';

import { Pie, PieChart, Cell, Label } from 'recharts';
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
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import { useMemo } from 'react';

interface LocalePieChartProps {
  data: { locale: string; count: number }[];
  title?: string;
  description?: string;
}

const LOCALE_LABELS: Record<string, string> = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  th: 'Thai',
};

const COLORS = [
  'hsl(142 71% 45%)',  // Green - English
  'hsl(38 92% 50%)',   // Orange - Spanish  
  'hsl(262 83% 58%)',  // Purple - French
  'hsl(346 77% 50%)',  // Pink/Red - Thai
];

export function LocalePieChart({ 
  data, 
  title = 'Posts by Locale',
  description = 'Distribution of content across languages'
}: LocalePieChartProps) {
  const chartConfig = useMemo(() => {
    const config: ChartConfig = {};
    data.forEach((item, index) => {
      config[item.locale] = {
        label: LOCALE_LABELS[item.locale] || item.locale.toUpperCase(),
        color: COLORS[index % COLORS.length],
      };
    });
    return config;
  }, [data]);

  const total = useMemo(() => data.reduce((acc, curr) => acc + curr.count, 0), [data]);

  const chartData = useMemo(() => 
    data.map((item, index) => ({
      ...item,
      fill: COLORS[index % COLORS.length],
      name: LOCALE_LABELS[item.locale] || item.locale.toUpperCase(),
    })),
  [data]);

  if (data.length === 0) {
    return (
      <Card className="flex flex-col">
        <CardHeader className="items-center pb-0">
          <CardTitle>{title}</CardTitle>
          <CardDescription>No data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[300px]">
          <PieChart>
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
            <Pie
              data={chartData}
              dataKey="count"
              nameKey="locale"
              innerRadius={60}
              strokeWidth={5}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
              <Label
                content={({ viewBox }) => {
                  if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                    return (
                      <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                        <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-3xl font-bold">
                          {total}
                        </tspan>
                        <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 24} className="fill-muted-foreground">
                          Posts
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </Pie>
            <ChartLegend content={<ChartLegendContent nameKey="locale" />} />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
