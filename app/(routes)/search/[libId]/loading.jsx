import { Spinner } from "@/components/ui/spinner"

export default function SearchConversationLoading() {
  return (
    <div className="flex h-[80vh] w-full items-center justify-center">
      <Spinner className="size-8 text-muted-foreground" />
    </div>
  )
}
