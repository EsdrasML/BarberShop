import * as React from "react";
import { cn } from "@/lib/utils";

// Estados diferenciados por color Y por forma (relleno, contorno, tachado) para no depender solo del color.
type Tone = "neutral" | "pending" | "info" | "done" | "danger";

const tones: Record<Tone, string> = {
  neutral: "bg-steel text-black",
  pending: "border border-gold text-gold",
  info: "border border-cyan-pulse text-cyan-pulse",
  done: "bg-white text-black",
  danger: "border border-danger text-danger line-through decoration-1",
};

export function Badge({ tone = "neutral", className, ...props }: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn("inline-flex items-center rounded-full px-2 py-1 text-[0.625rem] font-medium uppercase tracking-[0.08em]", tones[tone], className)}
      {...props}
    />
  );
}
