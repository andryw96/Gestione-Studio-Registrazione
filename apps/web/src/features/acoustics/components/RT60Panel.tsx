import { BANDS_HZ, type RT60Result } from "@studio/core";
import type { EChartsOption } from "echarts";
import { useMemo } from "react";
import { useThemeColors } from "../../../app/theme";
import { EChart } from "../../../shared/EChart";

const TOKENS = ["text", "text-muted", "border", "accent", "warning", "ok"] as const;
const bandLabel = (b: number) => (b >= 1000 ? `${b / 1000} k` : `${b}`);
const f2 = (n: number) => n.toFixed(2);

export function RT60Panel({ result, target }: { result: RT60Result; target: { min: number; max: number } }) {
  const c = useThemeColors(TOKENS);

  const option = useMemo<EChartsOption>(
    () =>
      ({
        animation: false,
        textStyle: { color: c.text },
        legend: { top: 0, textStyle: { color: c.text } },
        grid: { left: 48, right: 16, top: 36, bottom: 36 },
        tooltip: { trigger: "axis", valueFormatter: (v: unknown) => `${Number(v).toFixed(2)} s` },
        xAxis: {
          type: "category",
          data: BANDS_HZ.map(bandLabel),
          name: "Hz",
          nameTextStyle: { color: c["text-muted"] },
          axisLabel: { color: c["text-muted"] },
          axisLine: { lineStyle: { color: c.border } },
        },
        yAxis: {
          type: "value",
          min: 0,
          name: "T60 (s)",
          nameTextStyle: { color: c["text-muted"] },
          axisLabel: { color: c["text-muted"] },
          splitLine: { lineStyle: { color: c.border, opacity: 0.5 } },
        },
        series: [
          {
            name: "Sabine",
            type: "line",
            data: result.bands.map((b) => b.sabineS),
            lineStyle: { color: c.warning, width: 2 },
            itemStyle: { color: c.warning },
            symbolSize: 7,
            markArea: {
              silent: true,
              itemStyle: { color: c.ok, opacity: 0.14 },
              data: [[{ yAxis: target.min, name: "Obiettivo" }, { yAxis: target.max }]],
              label: { color: c["text-muted"], position: "insideTopLeft" },
            },
          },
          {
            name: "Eyring",
            type: "line",
            data: result.bands.map((b) => b.eyringS),
            lineStyle: { color: c.accent, width: 2 },
            itemStyle: { color: c.accent },
            symbolSize: 7,
          },
        ],
      }) as EChartsOption,
    [result, target, c],
  );

  return (
    <>
      <EChart option={option} height={280} />
      <table className="data" style={{ marginTop: 8 }}>
        <thead>
          <tr>
            <th>Banda (Hz)</th>
            {BANDS_HZ.map((b) => (
              <th key={b}>{bandLabel(b)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>ᾱ medio</td>
            {result.bands.map((b) => (
              <td key={b.bandHz}>{f2(b.meanAlpha)}</td>
            ))}
          </tr>
          <tr>
            <td>A (m²)</td>
            {result.bands.map((b) => (
              <td key={b.bandHz}>{b.absorptionM2.toFixed(1)}</td>
            ))}
          </tr>
          <tr>
            <td>T60 Sabine (s)</td>
            {result.bands.map((b) => (
              <td key={b.bandHz}>{f2(b.sabineS)}</td>
            ))}
          </tr>
          <tr>
            <td>T60 Eyring (s)</td>
            {result.bands.map((b) => (
              <td key={b.bandHz}>{f2(b.eyringS)}</td>
            ))}
          </tr>
        </tbody>
      </table>
    </>
  );
}
