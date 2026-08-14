const COLOR_CLASSES = {
  green: "bg-emerald-500",
  yellow: "bg-amber-400",
  red: "bg-red-500",
};

function StatusIndicator({ label, color }) {
  return (
    <span className="flex items-center gap-1.5 text-sm text-slate-500">
      <span className={`w-2 h-2 rounded-full ${COLOR_CLASSES[color] || "bg-slate-300"}`} />
      {label}
    </span>
  );
}

export default StatusIndicator;