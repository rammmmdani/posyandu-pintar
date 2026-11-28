export default function Card({ className = "", children }) {
  return (
    <div className={`rounded-xl border border-garis bg-white p-4 ${className}`}>
      {children}
    </div>
  );
}
