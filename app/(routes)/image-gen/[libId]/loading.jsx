export default function ImageConversationLoading() {
  return (
    <div className="space-y-6 px-4 py-6 md:px-6 md:py-8">
      <div className="space-y-2">
        <div className="h-3 w-24 rounded-full bg-muted animate-pulse" />
        <div className="h-8 w-72 max-w-full rounded-full bg-muted animate-pulse" />
        <div className="h-4 w-[min(36rem,100%)] rounded-full bg-muted animate-pulse" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/60 shadow-xs animate-pulse">
          <div className="border-b border-border/40 px-4 py-3 sm:px-5">
            <div className="h-3 w-28 rounded-full bg-muted" />
            <div className="mt-2 h-4 w-40 rounded-full bg-muted" />
          </div>
          <div className="p-4 sm:p-5">
            <div className="min-h-96 rounded-xl border border-border/40 bg-muted/40" />
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/60 shadow-xs animate-pulse">
          <div className="border-b border-border/40 px-5 py-4">
            <div className="h-3 w-20 rounded-full bg-muted" />
            <div className="mt-2 h-4 w-44 rounded-full bg-muted" />
          </div>
          <div className="space-y-4 p-5">
            <div className="h-40 rounded-xl border border-border/40 bg-muted/40" />
            <div className="space-y-2">
              <div className="h-10 rounded-xl bg-muted/30" />
              <div className="h-10 rounded-xl bg-muted/30" />
              <div className="h-10 rounded-xl bg-muted/30" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
