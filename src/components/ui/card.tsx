import * as React from "react";
import { cn } from "@/lib/utils";

// La elevación se logra con un gris más claro que el fondo, nunca con sombras.
type CardProps = React.HTMLAttributes<HTMLDivElement> & { tone?: "charcoal" | "iron" | "black" };

const tones = {
  charcoal: "bg-charcoal",
  iron: "bg-iron",
  black: "bg-black border border-graphite",
};

export function Card({ tone = "charcoal", className, ...props }: CardProps) {
  return <div className={cn("rounded-2xl p-6 md:p-8", tones[tone], className)} {...props} />;
}
