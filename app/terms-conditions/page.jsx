'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText, Calendar, Shield, Scale } from 'lucide-react';
import Link from 'next/link';

export default function TermsAndConditions() {
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
              <FileText className="w-12 h-12" />
              <h1 className="text-4xl font-bold">Terms & Conditions</h1>
            </div>
            <p className="text-xl text-violet-100 max-w-2xl mx-auto">
              Please read these terms carefully before using ChatBox AI services
            </p>
            <div className="flex items-center justify-center gap-2 mt-4 text-violet-200">
              <Calendar className="w-4 h-4" />
              <span>Last updated: November 8, 2025</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-12 max-w-4xl">
        <div className="space-y-8">
          {/* Introduction */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-violet-600" />
                1. Introduction
              </CardTitle>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none">
              <p>
                Welcome to ChatBox AI. These Terms and Conditions ("Terms") govern your use of our AI-powered 
                conversational platform and services. By accessing or using ChatBox AI, you agree to be bound 
                by these Terms.
              </p>
              <p>
                ChatBox AI is operated by Technon Pvt Ltd. We provide artificial intelligence services 
                including but not limited to text generation, conversation assistance, and related AI capabilities.
              </p>
            </CardContent>
          </Card>

          {/* Acceptance of Terms */}
          <Card>
            <CardHeader>
              <CardTitle>2. Acceptance of Terms</CardTitle>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none">
              <p>
                By creating an account or using ChatBox AI services, you confirm that you:
              </p>
              <ul>
                <li>Are at least 18 years old or have parental consent</li>
                <li>Have the legal capacity to enter into these Terms</li>
                <li>Agree to comply with all applicable laws and regulations</li>
                <li>Accept responsibility for your use of the service</li>
              </ul>
            </CardContent>
          </Card>

          {/* Service Description */}
          <Card>
            <CardHeader>
              <CardTitle>3. Service Description</CardTitle>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none">
              <p>
                ChatBox AI provides AI-powered conversational services including:
              </p>
              <ul>
                <li>Text generation and completion</li>
                <li>Question answering and research assistance</li>
                <li>Creative writing and content creation</li>
                <li>Code assistance and programming help</li>
                <li>Language translation and communication support</li>
              </ul>
              <p>
                We offer both Free and Pro subscription tiers with different credit allocations and feature access.
              </p>
            </CardContent>
          </Card>

          {/* User Accounts */}
          <Card>
            <CardHeader>
              <CardTitle>4. User Accounts</CardTitle>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none">
              <p>
                To use ChatBox AI, you must create an account. You are responsible for:
              </p>
              <ul>
                <li>Maintaining the confidentiality of your login credentials</li>
                <li>All activities that occur under your account</li>
                <li>Providing accurate and complete information</li>
                <li>Updating your information as necessary</li>
                <li>Notifying us immediately of any unauthorized use</li>
              </ul>
              <p>
                We reserve the right to suspend or terminate accounts that violate these Terms.
              </p>
            </CardContent>
          </Card>

          {/* Subscription and Billing */}
          <Card>
            <CardHeader>
              <CardTitle>5. Subscription and Billing</CardTitle>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none">
              <p>
                <strong>Free Plan:</strong> Includes 5,000 monthly credits with access to basic features.
              </p>
              <p>
                <strong>Pro Plan:</strong> ₹299 per month, includes 25,000 monthly credits and premium features.
              </p>
              <ul>
                <li>Subscriptions auto-renew monthly unless cancelled</li>
                <li>Payment is processed through secure Razorpay gateway</li>
                <li>Refunds are not provided for unused credits or partial months</li>
                <li>You may cancel your subscription anytime from your account settings</li>
                <li>Upon cancellation, Pro benefits remain until the end of the billing cycle</li>
              </ul>
            </CardContent>
          </Card>

          {/* Usage Policies */}
          <Card>
            <CardHeader>
              <CardTitle>6. Usage Policies</CardTitle>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none">
              <p>
                You agree not to use ChatBox AI for:
              </p>
              <ul>
                <li>Illegal activities or harmful content generation</li>
                <li>Harassment, abuse, or threatening behavior</li>
                <li>Spam, phishing, or fraudulent activities</li>
                <li>Violating intellectual property rights</li>
                <li>Attempting to reverse engineer or exploit our systems</li>
                <li>Generating content that violates our content policy</li>
              </ul>
            </CardContent>
          </Card>

          {/* Intellectual Property */}
          <Card>
            <CardHeader>
              <CardTitle>7. Intellectual Property</CardTitle>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none">
              <p>
                ChatBox AI and its underlying technology are owned by Technon Pvt Ltd. You retain ownership 
                of content you create using our service, but grant us necessary rights to provide the service.
              </p>
              <p>
                AI-generated content may not be eligible for copyright protection. You should verify the 
                originality and legality of any content before commercial use.
              </p>
            </CardContent>
          </Card>

          {/* Limitation of Liability */}
          <Card>
            <CardHeader>
              <CardTitle>8. Limitation of Liability</CardTitle>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none">
              <p>
                ChatBox AI is provided "as is" without warranties. We are not liable for:
              </p>
              <ul>
                <li>Accuracy or reliability of AI-generated content</li>
                <li>Decisions made based on our service</li>
                <li>Service interruptions or downtime</li>
                <li>Data loss or security breaches beyond our control</li>
                <li>Indirect, consequential, or punitive damages</li>
              </ul>
              <p>
                Our total liability is limited to the amount you paid for the service in the last 12 months.
              </p>
            </CardContent>
          </Card>

          {/* Termination */}
          <Card>
            <CardHeader>
              <CardTitle>9. Termination</CardTitle>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none">
              <p>
                Either party may terminate this agreement at any time. We may terminate your account for:
              </p>
              <ul>
                <li>Violation of these Terms</li>
                <li>Fraudulent or illegal activity</li>
                <li>Non-payment of subscription fees</li>
                <li>Abuse of our systems or other users</li>
              </ul>
              <p>
                Upon termination, your access will be suspended and data may be deleted after a reasonable period.
              </p>
            </CardContent>
          </Card>

          {/* Changes to Terms */}
          <Card>
            <CardHeader>
              <CardTitle>10. Changes to Terms</CardTitle>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none">
              <p>
                We may update these Terms from time to time. We'll notify you of significant changes 
                via email or service notification. Continued use of the service after changes 
                constitutes acceptance of the new Terms.
              </p>
            </CardContent>
          </Card>

          {/* Governing Law */}
          <Card>
            <CardHeader>
              <CardTitle>11. Governing Law</CardTitle>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none">
              <p>
                These Terms are governed by the laws of India. Any disputes will be resolved in 
                the courts of New Delhi, India.
              </p>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-violet-600" />
                12. Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none">
              <p>
                For questions about these Terms, please contact us at:
              </p>
              <div className="bg-gray-100 dark:bg-[oklch(0.2478_0_0)] p-4 rounded-lg not-prose">
                <p className="mb-2"><strong>Technon Pvt Ltd</strong></p>
                <p className="mb-1">Email: arpitariyanm@gmail.com</p>
                <p className="mb-1">Support: ariyanariyan82361@gmail.com</p>
                <p>Website: https://technon.co.in</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Back to Top */}
        <div className="text-center mt-12">
          <Link href="/">
            <Button variant="outline" size="lg">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return to ChatBox AI
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}