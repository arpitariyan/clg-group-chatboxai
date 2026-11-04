# Forgot Password Resend Integration

## Overview
Replaced the legacy `nodemailer` SMTP email sending function in the password reset OTP route with the new `Resend` email service to ensure reliable delivery and consistent branding across Chatbox AI.

## Changes Made
1. **File Updated**: `app/api/auth/reset-password-otp/route.js`
2. **Replaced Email Provider**: Swapped the `nodemailer` transporter for the `Resend` client.
3. **Updated Template**: Implemented a styled HTML template `buildResetEmailHtml(otp, recipientEmail)` matching the sleek dark-mode design of the signup verification email.
4. **Sender details**: Emails are now sent from `Chatbox AI <no-reply@chatboxai.co.in>`.
5. **Security**: Retained existing rate-limiting logic and secure OTP generation. 
6. **Data Structure**: Standardized the way OTPs are saved to Appwrite to match the recent 10-character `otp` attribute schema limit by storing plaintext 6-digit codes.

## Requirements
- The `.env.local` file must contain a valid `RESEND_API_KEY`.
- The domain `chatboxai.co.in` must be verified in the Resend dashboard.
