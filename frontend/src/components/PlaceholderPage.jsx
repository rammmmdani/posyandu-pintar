import Card from "./ui/Card";

export default function PlaceholderPage({ title }) {
  return (
    <div>
      <h1 className="text-2xl font-bold">{title}</h1>
      <Card className="mt-4">
        <p className="text-redam">Halaman ini sedang dikerjakan.</p>
      </Card>
    </div>
  );
}
