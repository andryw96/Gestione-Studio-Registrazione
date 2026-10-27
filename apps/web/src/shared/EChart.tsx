import * as echarts from "echarts";
import { useEffect, useRef } from "react";

export function EChart({ option, height = 320 }: { option: echarts.EChartsOption; height?: number }) {
  const el = useRef<HTMLDivElement>(null);
  const chart = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    const c = echarts.init(el.current!);
    chart.current = c;
    const ro = new ResizeObserver(() => c.resize());
    ro.observe(el.current!);
    return () => {
      ro.disconnect();
      c.dispose();
      chart.current = null;
    };
  }, []);

  useEffect(() => {
    chart.current?.setOption(option, true);
  }, [option]);

  return <div ref={el} style={{ height, width: "100%" }} />;
}
