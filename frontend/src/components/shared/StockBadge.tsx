interface StockBadgeProps {
  status: "in_stock" | "low_stock" | "out_of_stock" | string;
  quantity?: number;
  size?: "sm" | "md";
}

const config = {
  in_stock: {
    label: "In Stock",
    classes: "bg-green-50  text-green-700  border-green-200",
  },
  low_stock: {
    label: "Low Stock",
    classes: "bg-yellow-50 text-yellow-700 border-yellow-200",
  },
  out_of_stock: {
    label: "Out of Stock",
    classes: "bg-red-50    text-red-700    border-red-200",
  },
};

export default function StockBadge({
  status,
  quantity,
  size = "sm",
}: StockBadgeProps) {
  const cfg = config[status as keyof typeof config] ?? config.in_stock;
  const padding = size === "md" ? "px-3 py-1 text-xs" : "px-2 py-0.5 text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-medium whitespace-nowrap ${padding} ${cfg.classes}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {cfg.label}
      {quantity !== undefined && (
        <span className="opacity-70">({quantity})</span>
      )}
    </span>
  );
}
