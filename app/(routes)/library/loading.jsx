export default function LibraryLoading() {
  return (
    <div className="space-y-4 p-4 md:p-6 animate-pulse">
      <div className="h-12 w-2/3 rounded-lg bg-muted/60" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="h-40 rounded-xl bg-muted/60" />
        <div className="h-40 rounded-xl bg-muted/60" />
        <div className="h-40 rounded-xl bg-muted/60" />
      </div>
    </div>
  );
}
