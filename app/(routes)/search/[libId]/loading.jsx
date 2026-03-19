export default function SearchConversationLoading() {
  return (
    <div className="space-y-4 p-4 md:p-6 animate-pulse">
      <div className="h-10 w-1/2 rounded-lg bg-muted/60" />
      <div className="space-y-3">
        <div className="h-24 rounded-xl bg-muted/60" />
        <div className="h-24 rounded-xl bg-muted/60" />
        <div className="h-24 rounded-xl bg-muted/60" />
      </div>
    </div>
  );
}
