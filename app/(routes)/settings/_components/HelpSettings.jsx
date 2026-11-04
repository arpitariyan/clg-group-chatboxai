'use client';

import React from 'react';
import { HelpCircle, FileText, Shield, ChevronRight, MessageSquare } from '@/components/ui/animated-icon';

export default function HelpSettings() {
  const handleNavigateToPage = (path) => {
    window.open(path, '_blank');
  };

  const helpResources = [
    {
      title: 'Help Center',
      description: 'Browse FAQs and detailed guides on how to use ChatBox AI',
      path: '/help-center',
      icon: HelpCircle,
      iconColor: 'text-blue-600 dark:text-blue-400',
      bgClass: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      title: 'Terms & Conditions',
      description: 'Read our terms of service and usage policies',
      path: '/terms-conditions',
      icon: FileText,
      iconColor: 'text-gray-600 dark:text-gray-400',
      bgClass: 'bg-gray-100 dark:bg-gray-800',
    },
    {
      title: 'Privacy Policy',
      description: 'Learn how we handle and protect your personal data',
      path: '/privacy-policy',
      icon: Shield,
      iconColor: 'text-purple-600 dark:text-purple-400',
      bgClass: 'bg-purple-50 dark:bg-purple-900/20',
    },
    {
      title: 'Live Chat & Support',
      description: 'Get in touch with our team for help. Typically responds within 24 to 48 hours.',
      path: '/support',
      icon: MessageSquare,
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      bgClass: 'bg-emerald-50 dark:bg-emerald-900/20',
    },
  ];

  return (
    <div className="space-y-10 sm:space-y-12">
      <section className="space-y-5 sm:space-y-6">
        <div>
          <h2 className="text-xl font-medium mb-1">Help & Resources</h2>
          <p className="text-sm text-muted-foreground">Get help and learn more about ChatBox AI.</p>
        </div>

        <div className="max-w-2xl space-y-3 sm:space-y-4">
          {helpResources.map((item, idx) => {
            const Icon = item.icon;
            return (
              <button 
                key={idx}
                onClick={() => handleNavigateToPage(item.path)}
                className="group w-full flex items-center justify-between p-3.5 sm:p-4 rounded-xl border border-border/60 bg-card/60 hover:bg-accent/60 backdrop-blur-xs transition-all duration-200 cursor-pointer text-left shadow-xs active:scale-[0.99]"
              >
                <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                  <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${item.bgClass} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${item.iconColor}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-sm sm:text-base text-foreground group-hover:text-primary transition-colors">{item.title}</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 shrink-0 ml-2" />
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

