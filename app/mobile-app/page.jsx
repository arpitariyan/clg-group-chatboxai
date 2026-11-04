import MobileAppClient from './MobileAppClient';

export const metadata = {
  title: 'ChatBoxAI Android App — Download Latest APK',
  description:
    'Download the latest ChatBoxAI Android APK. Access 56+ frontier AI models on your phone. Native Android experience with deep research, image generation, code assistance, and more.',
  alternates: {
    canonical: '/mobile-app',
  },
};

export default function MobileAppPage() {
  return <MobileAppClient />;
}
