import ChatBoxAiInput from "../../_components/ChatBoxAiInput";
import AuthGuard from "../../_components/AuthGuard";

export default function AppPage() {
  return (
    <AuthGuard>
      <div className="w-full">
        <ChatBoxAiInput />
      </div>
    </AuthGuard>
  );
}
