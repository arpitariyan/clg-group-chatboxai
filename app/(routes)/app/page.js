import ChatBoxAiInput from "../../_components/ChatBoxAiInput";
import AuthGuard from "../../_components/AuthGuard";

export default function AppPage() {
  return (
    <AuthGuard>
      <div className="w-full h-full flex flex-col">
        <ChatBoxAiInput />
      </div>
    </AuthGuard>
  );
}
