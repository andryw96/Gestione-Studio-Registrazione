import type { Mode, ModeAnalysis, ModeType } from "@studio/core";
import type { EChartsOption } from "echarts";
import { useMemo } from "react";
import { useThemeColors } from "../../../app/theme";
import { EChart } from "../../../shared/EChart";

const TYPE_LABEL: Record<ModeType, string> = { axial: "Assiale", tangential: "Tangenziale", oblique: "Obliquo" };

const TOKENS = ["text", "text-muted", "border", "mode-axial", "mode-tangential", "mode-oblique", "band-critical", "band-gap"] as const;

export function ModesChart({ modes, analysis, maxHz }: { modes: Mode[]; analysis: ModeAnalysis; maxHz: number }) {
  const c = useThemeColors(TOKENS);

  const option = useMemo<EChartsOption>(() => {
    const colorOf: Record<ModeType, string> = { axial: c["mode-axial"], tangential: c["mode-tangential"], oblique: c["mode-oblique"] };

    const stems = (type: ModeType) => ({
      type: "custom" as const,
      name: TYPE_LABEL[type],
      data: modes.filter((m) => m.type === type).map((m) => ({ value: [m.fHz, m.weight, m.n.join(","), TYPE_LABEL[type]] })),
      encode: { x: 0, y: 1 },
      itemStyle: { color: colorOf[type] },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      renderItem: (_p: any, api: any) => {
        const base = api.coord([api.value(0), 0]);
        const top = api.coord([api.value(0), api.value(1)]);
        return { type: "line", shape: { x1: base[0], y1: base[1], x2: top[0], y2: top[1] }, style: { stroke: colorOf[type], lineWidth: 2.5 } };
      },
    });

    // Serie vuota che ospita le bande dei cluster critici e dei vuoti spettrali
    const bands = {
      type: "scatter" as const,
      data: [],
      silent: true,
      markArea: {
        silent: true,
        data: [
          ...analysis.clusters.map((cl) => [
            { xAxis: cl.fromHz - 0.5, name: "Cluster", itemStyle: { color: c["band-critical"] } },
            { xAxis: cl.toHz + 0.5 },
          ]),
          ...analysis.gaps.map((g) => [
            { xAxis: g.fromHz, name: "Vuoto", itemStyle: { color: c["band-gap"] } },
            { xAxis: g.toHz },
          ]),
        ],
      },
    };

    return {
      animation: false,
      textStyle: { color: c.text },
      legend: { top: 0, textStyle: { color: c.text }, data: Object.values(TYPE_LABEL) },
      grid: { left: 48, right: 16, top: 36, bottom: 36 },
      tooltip: {
        trigger: "item",
        formatter: (p: unknown) => {
          const v = (p as { value?: [number, number, string, string] }).value;
          if (!v) return "";
          return `${v[3]} (${v[2]})<br/><b>${v[0].toFixed(1)} Hz</b>`;
        },
      },
      xAxis: {
        type: "value",
        min: 0,
        max: maxHz,
        name: "Hz",
        nameTextStyle: { color: c["text-muted"] },
        axisLabel: { color: c["text-muted"] },
        axisLine: { lineStyle: { color: c.border } },
        splitLine: { lineStyle: { color: c.border, opacity: 0.5 } },
      },
      yAxis: {
        type: "value",
        min: 0,
        max: 1.1,
        name: "Peso",
        nameTextStyle: { color: c["text-muted"] },
        axisLabel: { color: c["text-muted"] },
        splitLine: { show: false },
      },
      series: [stems("axial"), stems("tangential"), stems("oblique"), bands],
    } as EChartsOption;
  }, [modes, analysis, maxHz, c]);

  return <EChart option={option} height={300} />;
}
