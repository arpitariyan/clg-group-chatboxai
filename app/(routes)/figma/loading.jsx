export default function FigmaLoading() {
  return (
    <div className="space-y-4 p-4 md:p-6 animate-pulse">
      <div className="h-10 w-1/3 rounded-lg bg-muted/60" />
      <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-12rem)]">
        {/* Left panel skeleton */}
        <div className="w-full lg:w-[40%] space-y-4">
          <div className="h-12 rounded-lg bg-muted/60" />
          <div className="h-64 rounded-xl bg-muted/60" />
          <div className="h-48 rounded-xl bg-muted/60" />
        </div>
        {/* Right panel skeleton */}
        <div className="w-full lg:w-[60%] space-y-4">
          <div className="h-12 rounded-lg bg-muted/60" />
          <div className="h-96 rounded-xl bg-muted/60" />
        </div>
      </div>
    </div>
  );
}
