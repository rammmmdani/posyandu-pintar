const tones = {
  info: "border-sky-200 bg-sky-50 text-sky-900",
  success: "border-daun-100 bg-daun-50 text-daun-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  error: "border-red-200 bg-red-50 text-red-900",
};

export default function Alert({
  tone = "info",
  title,
  children,
  className = "",
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-lg border px-3 py-2 text-sm ${tones[tone]} ${className}`}
    >
      {title && <p className="font-semibold">{title}</p>}
      {children && <div>{children}</div>}
    </div>
  );
}
