export default function EmptyState({ title, description, action }) {
  return (
    <div className="rounded-xl border border-dashed border-garis bg-white p-10 text-center">
      <p className="font-semibold">{title}</p>
      {description && <p className="mt-1 text-sm text-redam">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
