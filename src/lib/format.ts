export const money = (n: number | string | null | undefined) => {
  const num = typeof n === "string" ? parseFloat(n) : (n ?? 0);
  return `$${(num || 0).toFixed(2)}`;
};

export const platformIcon: Record<string, string> = {
  youtube: "▶",
  instagram: "◉",
  tiktok: "♪",
  twitter: "𝕏",
  facebook: "f",
  telegram: "✈",
  other: "★",
};

export const platformColor: Record<string, string> = {
  youtube: "text-destructive",
  instagram: "text-accent",
  tiktok: "text-foreground",
  twitter: "text-foreground",
  facebook: "text-accent",
  telegram: "text-primary",
  other: "text-muted-foreground",
};
