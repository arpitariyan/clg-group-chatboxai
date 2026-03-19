export default function AppLoading() {
  return (
    <div className="space-y-4 p-4 md:p-6 animate-pulse">
      <div className="h-12 w-full rounded-lg bg-muted/60" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="h-40 rounded-xl bg-muted/60" />
        <div className="h-40 rounded-xl bg-muted/60" />
      </div>
      <div className="h-64 rounded-xl bg-muted/60" />
    </div>
  );
}
