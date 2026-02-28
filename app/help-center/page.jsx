'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  HelpCircle, 
  MessageSquare, 
  Zap, 
  Crown, 
  Shield, 
  CreditCard, 
  Settings, 
  Search,
  ArrowLeft,
  Mail,
  Phone,
  Clock
} from 'lucide-react';
import Link from 'next/link';

export default function HelpCenter() {
  const faqData = [
    {
      category: "Getting Started",
      icon: MessageSquare,
      questions: [
        {
          q: "How do I create an account?",
          a: "Click on 'Sign Up' in the sidebar, enter your email address, create a password, and verify your email. You'll immediately get 5,000 free credits to start using ChatBox AI."
        },
        {
          q: "What can I do with ChatBox AI?",
          a: "ChatBox AI helps you with text generation, creative writing, code assistance, research, language translation, and much more. You can have natural conversations with our AI models to get help with various tasks."
        },
        {
          q: "How do credits work?",
          a: "Credits are consumed when you interact with AI models. Free users get 5,000 credits monthly, Pro users get 25,000 credits. Different models consume different amounts of credits based on their complexity."
        }
      ]
    },
    {
      category: "Pro Plan",
      icon: Crown,
      questions: [
        {
          q: "What's included in the Pro plan?",
          a: "Pro plan includes 25,000 monthly credits, access to premium AI models, priority support, advanced features, and faster response times. Perfect for power users and professionals."
        },
        {
          q: "How much does Pro cost?",
          a: "The Pro plan costs ₹299 per month. You can cancel anytime, and you'll retain Pro benefits until the end of your billing cycle."
        },
        {
          q: "Can I downgrade or cancel my Pro subscription?",
          a: "Yes, you can cancel your Pro subscription anytime from the Settings modal. You'll retain Pro benefits until the end of your current billing period, then automatically switch to the Free plan."
        }
      ]
    },
    {
      category: "Security & Privacy",
      icon: Shield,
      questions: [
        {
          q: "Is my data secure?",
          a: "Yes, we use industry-standard encryption and security measures. Your conversations and data are encrypted in transit and at rest. We never share your personal data with third parties."
        },
        {
          q: "What is Multi-Factor Authentication (MFA)?",
          a: "MFA adds an extra layer of security to your account. When enabled, you'll need to verify your identity with an OTP sent to your Gmail address, in addition to your password."
        },
        {
          q: "How do I enable MFA?",
          a: "Go to Settings → Security → Multi-Factor Authentication. Enter a Gmail address where you want to receive OTP codes, verify the OTP, and MFA will be enabled for your account."
        }
      ]
    },
    {
      category: "Billing & Payments",
      icon: CreditCard,
      questions: [
        {
          q: "What payment methods do you accept?",
          a: "We accept all major credit/debit cards, UPI, net banking, and digital wallets through Razorpay. All payments are processed securely."
        },
        {
          q: "When do credits reset?",
          a: "Credits reset monthly from the date you first created your account. Free users get 5,000 credits, Pro users get 25,000 credits each month."
        },
        {
          q: "What happens if I run out of credits?",
          a: "If you run out of credits, you won't be able to use AI features until your credits reset next month or you upgrade to Pro for more credits."
        }
      ]
    },
    {
      category: "Technical Support",
      icon: Settings,
      questions: [
        {
          q: "The AI isn't responding properly. What should I do?",
          a: "Try refreshing the page, check your internet connection, or try a different model. If the issue persists, please report it through Settings → Help → Report a Bug."
        },
        {
          q: "How do I report bugs or issues?",
          a: "Go to Settings → Help → Report a Bug. Provide a detailed description of the issue, steps to reproduce it, and we'll investigate and fix it promptly."
        },
        {
          q: "Can I switch between different AI models?",
          a: "Yes, you can select different AI models based on your plan. Free users have access to basic models, while Pro users get access to premium models with better capabilities."
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-[oklch(0.2478_0_0)]">
      {/* Header */}
      <div className="bg-linear-to-r dark:bg-[oklch(0.2478_0_0)] text-white">
        <div className="container mx-auto px-6 py-12">
          <div className="flex items-center gap-4 mb-6">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to ChatBox AI
              </Button>
            </Link>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <HelpCircle className="w-12 h-12" />
              <h1 className="text-4xl font-bold">Help Center</h1>
            </div>
            <p className="text-xl text-violet-100 max-w-2xl mx-auto">
              Find answers to your questions and learn how to make the most of ChatBox AI
            </p>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="container mx-auto px-6 py-8">
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <MessageSquare className="w-8 h-8 mx-auto text-violet-600 mb-2" />
              <CardTitle>Getting Started</CardTitle>
              <CardDescription>New to ChatBox AI? Start here</CardDescription>
            </CardHeader>
          </Card>
          
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <Crown className="w-8 h-8 mx-auto text-amber-600 mb-2" />
              <CardTitle>Pro Features</CardTitle>
              <CardDescription>Learn about premium benefits</CardDescription>
            </CardHeader>
          </Card>
          
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <Shield className="w-8 h-8 mx-auto text-green-600 mb-2" />
              <CardTitle>Security</CardTitle>
              <CardDescription>Keep your account safe</CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* FAQ Sections */}
        <div className="space-y-8">
          {faqData.map((category, categoryIndex) => (
            <div key={categoryIndex}>
              <div className="flex items-center gap-3 mb-6">
                <category.icon className="w-6 h-6 text-violet-600" />
                <h2 className="text-2xl font-bold">{category.category}</h2>
                <Badge variant="outline">{category.questions.length} questions</Badge>
              </div>
              
              <div className="space-y-4">
                {category.questions.map((faq, faqIndex) => (
                  <Card key={faqIndex} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <h3 className="font-semibold text-lg mb-3 text-gray-900 dark:text-gray-100">
                        {faq.q}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                        {faq.a}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Contact Support */}
        <div className="mt-16">
          <Card className="border-violet-200 dark:border-violet-800">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Still Need Help?</CardTitle>
              <CardDescription>
                Can't find what you're looking for? Our support team is here to help
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-6">
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center">
                  <Mail className="w-8 h-8 mx-auto text-violet-600 mb-2" />
                  <h3 className="font-semibold mb-1">Email Support</h3>
                  <p className="text-sm text-muted-foreground mb-3">Get help via email</p>
                  <Button variant="outline" size="sm">
                    arpitariyanm@gmail.com
                  </Button>
                </div>
                
                <div className="text-center">
                  <MessageSquare className="w-8 h-8 mx-auto text-violet-600 mb-2" />
                  <h3 className="font-semibold mb-1">Bug Reports</h3>
                  <p className="text-sm text-muted-foreground mb-3">Report issues directly</p>
                  <Link href="/">
                    <Button variant="outline" size="sm">
                      Report in Settings
                    </Button>
                  </Link>
                </div>
                
                <div className="text-center">
                  <Clock className="w-8 h-8 mx-auto text-violet-600 mb-2" />
                  <h3 className="font-semibold mb-1">Response Time</h3>
                  <p className="text-sm text-muted-foreground mb-3">We typically respond within</p>
                  <Badge>24 hours</Badge>
                </div>
              </div>
              
              <div className="pt-6 border-t">
                <p className="text-sm text-muted-foreground">
                  <Crown className="w-4 h-4 inline mr-1 text-amber-600" />
                  Pro users get priority support with faster response times
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}