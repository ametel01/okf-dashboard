import type { ReactNode } from "react";

export function Badge({
  children,
  tone = "primary",
}: {
  children: ReactNode;
  tone?: "primary" | "success" | "warning" | "danger" | "violet" | "muted";
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
