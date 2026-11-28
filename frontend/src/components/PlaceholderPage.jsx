import Card from "./ui/Card";

export default function PlaceholderPage({ title }) {
  return (
    <div>
      <h1 className="text-xl font-bold">{title}</h1>
      <Card className="mt-3">
        <p className="text-redam">Halaman ini sedang dikerjakan.</p>
      </Card>
    </div>
  );
}
