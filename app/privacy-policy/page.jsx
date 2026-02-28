'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Shield, Calendar, Eye, Lock, Server, UserX } from 'lucide-react';
import Link from 'next/link';

export default function PrivacyPolicy() {
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
              <Shield className="w-12 h-12" />
              <h1 className="text-4xl font-bold">Privacy Policy</h1>
            </div>
            <p className="text-xl text-green-100 max-w-2xl mx-auto">
              Your privacy is important to us. Learn how we collect, use, and protect your data.
            </p>
            <div className="flex items-center justify-center gap-2 mt-4 text-green-200">
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
                <Shield className="w-5 h-5 text-green-600" />
                1. Introduction
              </CardTitle>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none">
              <p>
                At ChatBox AI, we are committed to protecting your privacy and personal data. This Privacy Policy 
                explains how we collect, use, store, and protect your information when you use our AI-powered 
                conversational platform.
              </p>
              <p>
                By using ChatBox AI, you agree to the collection and use of information in accordance with this policy.
              </p>
            </CardContent>
          </Card>

          {/* Information We Collect */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-blue-600" />
                2. Information We Collect
              </CardTitle>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none">
              <h4>Personal Information:</h4>
              <ul>
                <li>Email address (for account creation and communication)</li>
                <li>Display name (optional)</li>
                <li>MFA email address (if Multi-Factor Authentication is enabled)</li>
                <li>Payment information (processed securely through Razorpay)</li>
                <li>Profile preferences (theme, language, accent color)</li>
              </ul>
              
              <h4>Usage Data:</h4>
              <ul>
                <li>Conversations and prompts submitted to AI models</li>
                <li>AI responses and generated content</li>
                <li>Credit usage and subscription information</li>
                <li>Feature usage analytics and interaction patterns</li>
                <li>Device information and browser type</li>
              </ul>
              
              <h4>Automatically Collected Data:</h4>
              <ul>
                <li>IP addresses and location information</li>
                <li>Cookies and similar tracking technologies</li>
                <li>Log files and usage statistics</li>
                <li>Error reports and performance metrics</li>
              </ul>
            </CardContent>
          </Card>

          {/* How We Use Your Information */}
          <Card>
            <CardHeader>
              <CardTitle>3. How We Use Your Information</CardTitle>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none">
              <p>We use your information to:</p>
              <ul>
                <li><strong>Provide Service:</strong> Process your requests and deliver AI-generated responses</li>
                <li><strong>Account Management:</strong> Create and maintain your account, handle subscriptions</li>
                <li><strong>Improve Service:</strong> Analyze usage patterns to enhance our AI models and features</li>
                <li><strong>Security:</strong> Protect against fraud, abuse, and unauthorized access</li>
                <li><strong>Communication:</strong> Send important updates, security alerts, and support responses</li>
                <li><strong>Billing:</strong> Process payments and manage subscription billing</li>
                <li><strong>Legal Compliance:</strong> Meet legal obligations and enforce our terms of service</li>
              </ul>
            </CardContent>
          </Card>

          {/* AI Training and Content Usage */}
          <Card>
            <CardHeader>
              <CardTitle>4. AI Training and Content Usage</CardTitle>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none">
              <p>
                <strong>Important:</strong> We do not use your personal conversations or data to train our AI models 
                or improve our algorithms without explicit consent.
              </p>
              <ul>
                <li>Your conversations remain private and are not shared with third parties</li>
                <li>We may analyze aggregate, anonymized usage patterns for service improvement</li>
                <li>Personal conversations are encrypted and stored securely</li>
                <li>You can delete your conversation history anytime from your account settings</li>
              </ul>
            </CardContent>
          </Card>

          {/* Data Sharing */}
          <Card>
            <CardHeader>
              <CardTitle>5. Data Sharing and Disclosure</CardTitle>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none">
              <p>We may share your information only in the following circumstances:</p>
              
              <h4>Service Providers:</h4>
              <ul>
                <li>Razorpay for payment processing</li>
                <li>Supabase for database services</li>
                <li>Firebase for authentication services</li>
                <li>Email service providers for notifications</li>
              </ul>
              
              <h4>Legal Requirements:</h4>
              <ul>
                <li>When required by law or court order</li>
                <li>To protect our rights, property, or safety</li>
                <li>In case of suspected illegal activity</li>
                <li>To enforce our Terms of Service</li>
              </ul>
              
              <p><strong>We never sell your personal data to third parties.</strong></p>
            </CardContent>
          </Card>

          {/* Data Security */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-red-600" />
                6. Data Security
              </CardTitle>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none">
              <p>We implement robust security measures to protect your data:</p>
              <ul>
                <li><strong>Encryption:</strong> All data is encrypted in transit and at rest</li>
                <li><strong>Secure Authentication:</strong> Multi-Factor Authentication available</li>
                <li><strong>Access Controls:</strong> Strict access controls and regular security audits</li>
                <li><strong>Secure Infrastructure:</strong> Industry-standard cloud security practices</li>
                <li><strong>Regular Updates:</strong> Continuous security monitoring and updates</li>
                <li><strong>Data Backup:</strong> Regular backups with secure storage</li>
              </ul>
              <p>
                However, no method of transmission over the internet is 100% secure. While we strive to protect 
                your data, we cannot guarantee absolute security.
              </p>
            </CardContent>
          </Card>

          {/* Data Retention */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="w-5 h-5 text-purple-600" />
                7. Data Retention
              </CardTitle>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none">
              <p>We retain your information for different periods based on the type of data:</p>
              <ul>
                <li><strong>Account Information:</strong> Until you delete your account</li>
                <li><strong>Conversation History:</strong> Until you delete it or account deletion</li>
                <li><strong>Payment Records:</strong> 7 years for tax and legal compliance</li>
                <li><strong>Usage Analytics:</strong> Up to 2 years in aggregated, anonymized form</li>
                <li><strong>Security Logs:</strong> Up to 1 year for security purposes</li>
              </ul>
              <p>
                When you delete your account, we will delete your personal data within 30 days, 
                except where we need to retain it for legal obligations.
              </p>
            </CardContent>
          </Card>

          {/* Your Rights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserX className="w-5 h-5 text-orange-600" />
                8. Your Rights and Choices
              </CardTitle>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none">
              <p>You have the following rights regarding your personal data:</p>
              <ul>
                <li><strong>Access:</strong> Request a copy of your personal data</li>
                <li><strong>Correction:</strong> Update incorrect or incomplete information</li>
                <li><strong>Deletion:</strong> Delete your account and associated data</li>
                <li><strong>Portability:</strong> Request your data in a portable format</li>
                <li><strong>Objection:</strong> Object to certain types of data processing</li>
                <li><strong>Restriction:</strong> Request limitation of data processing</li>
              </ul>
              
              <p>To exercise these rights, contact us at privacy@chatboxai.com or use the settings in your account.</p>
            </CardContent>
          </Card>

          {/* Cookies and Tracking */}
          <Card>
            <CardHeader>
              <CardTitle>9. Cookies and Tracking</CardTitle>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none">
              <p>We use cookies and similar technologies for:</p>
              <ul>
                <li>Authentication and session management</li>
                <li>Remembering your preferences and settings</li>
                <li>Analyzing usage patterns and improving our service</li>
                <li>Security and fraud prevention</li>
              </ul>
              <p>
                You can control cookies through your browser settings, but disabling them may affect 
                your ability to use certain features of our service.
              </p>
            </CardContent>
          </Card>

          {/* International Transfers */}
          <Card>
            <CardHeader>
              <CardTitle>10. International Data Transfers</CardTitle>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none">
              <p>
                Our services are hosted primarily in India. If you access ChatBox AI from outside India, 
                your information may be transferred to, stored, and processed in India where our servers 
                are located.
              </p>
              <p>
                We ensure appropriate safeguards are in place to protect your data during international 
                transfers in accordance with applicable data protection laws.
              </p>
            </CardContent>
          </Card>

          {/* Children's Privacy */}
          <Card>
            <CardHeader>
              <CardTitle>11. Children's Privacy</CardTitle>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none">
              <p>
                ChatBox AI is not intended for children under 18. We do not knowingly collect personal 
                information from children under 18. If we become aware that we have collected personal 
                information from a child under 18, we will take steps to delete such information.
              </p>
            </CardContent>
          </Card>

          {/* Changes to Privacy Policy */}
          <Card>
            <CardHeader>
              <CardTitle>12. Changes to This Privacy Policy</CardTitle>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none">
              <p>
                We may update this Privacy Policy from time to time. We will notify you of any changes 
                by posting the new Privacy Policy on this page and updating the "Last updated" date.
              </p>
              <p>
                We recommend reviewing this Privacy Policy periodically for any changes. Continued use 
                of our service after changes constitutes acceptance of the updated policy.
              </p>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-600" />
                13. Contact Us
              </CardTitle>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none">
              <p>
                If you have any questions about this Privacy Policy or our data practices, please contact us:
              </p>
              <div className="bg-gray-100 dark:bg-[oklch(0.2478_0_0)] p-4 rounded-lg not-prose">
                <p className="mb-2"><strong>Data Protection Officer</strong></p>
                <p className="mb-1">Email: arpitariyanm@gmail.com</p>
                <p className="mb-1">Support: ariyanariyan82361@gmail.com</p>
                <p className="mb-1">Company: Technon Pvt Ltd</p>
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