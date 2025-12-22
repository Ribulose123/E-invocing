'use client'
import React, { useState } from 'react'
import { useForm } from "react-hook-form";
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, ArrowLeft, Mail, Lock, Key, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { API_END_POINT } from '../config/Api';

interface CompleteForgotPasswordFormData {
  email: string;
  otp: string;
  password: string;
  confirmPassword: string;
}

type Step = 'email' | 'complete' | 'success';

const ForgotPassword = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<Step>('email');
  const [sentEmail, setSentEmail] = useState("");
  const router = useRouter();
  
  const emailForm = useForm<{ email: string }>();
  const completeForm = useForm<CompleteForgotPasswordFormData>();

  const onRequestOTP = async (data: { email: string }) => {
    setIsLoading(true);
    setError("");
    
    try {
      // This endpoint sends OTP to email - you might need to create this
      const response = await fetch(`${API_END_POINT.AUTH.INITIATE_PASSWORD_RESET}/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: data.email
        })
      });

      if (response.status === 404 || response.status === 501) {
        // If separate endpoint doesn't exist, we'll just show the complete form
        // and ask user to check their email for OTP
        setSentEmail(data.email);
        // Pre-fill the email in the next form
        completeForm.setValue('email', data.email);
        setStep('complete');
        setIsLoading(false);
        return;
      }

      const result = await response.json();

      if (response.ok) {
        setSentEmail(data.email);
        // Pre-fill the email in the next form
        completeForm.setValue('email', data.email);
        setStep('complete');
      } else {
        if (response.status === 400) {
          setError(result.message || "Invalid email address.");
        } else if (response.status === 404) {
          setError("No account found with this email address.");
        } else {
          setError(result.message || "Failed to send OTP. Please try again.");
        }
      }
    } catch (error) {
      console.error('Request OTP error:', error);
      // If endpoint doesn't exist, proceed to complete form
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        setSentEmail(data.email);
        completeForm.setValue('email', data.email);
        setStep('complete');
      } else {
        setError("Network error. Please check your connection and try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Complete forgot password process
  const onCompleteForgotPassword = async (data: CompleteForgotPasswordFormData) => {
    if (data.password !== data.confirmPassword) {
      completeForm.setError('confirmPassword', {
        type: 'manual',
        message: 'Passwords do not match'
      });
      return;
    }

    setIsLoading(true);
    setError("");
    
    try {
      const response = await fetch(API_END_POINT.AUTH.COMPLETE_PASSWORD_RESET, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: data.email,
          otp: data.otp,
          password: data.password
        })
      });

      const result = await response.json();

      if (response.ok) {
        setStep('success');
      } else {
        if (response.status === 400) {
          setError(result.message || "Invalid OTP or email. Please check and try again.");
        } else if (response.status === 404) {
          setError("Account not found. Please check your email address.");
        } else if (response.status === 410) {
          setError("OTP has expired. Please request a new one.");
          setStep('email');
        } else {
          setError(result.message || "Failed to reset password. Please try again.");
        }
      }
    } catch (error) {
      console.error('Complete forgot password error:', error);
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Back to previous step
  const goBack = () => {
    if (step === 'complete') {
      setStep('email');
    } else if (step === 'success') {
      router.push('/');
    }
    setError("");
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-gray-100">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="bg-[#8B1538] p-3 rounded-xl">
            <FileText className="size-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl text-slate-900">Gention E-invoice</h1>
            <p className="text-sm text-slate-600">Digital Invoice Management</p>
          </div>
        </div>

        <Card className="border-0 shadow-xl">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={goBack}
                className="p-1 hover:bg-gray-100 rounded-full"
                disabled={step === 'email'}
              >
                <ArrowLeft className={`size-5 ${step === 'email' ? 'text-gray-400' : 'text-gray-600'}`} />
              </button>
              <CardTitle>
                {step === 'email' && 'Forgot Password'}
                {step === 'complete' && 'Reset Password'}
                {step === 'success' && 'Success!'}
              </CardTitle>
            </div>
            <CardDescription>
              {step === 'email' && 'Enter your email address to receive a password reset OTP'}
              {step === 'complete' && sentEmail ? `Enter the OTP sent to ${sentEmail} and your new password` : 'Enter OTP and new password'}
              {step === 'success' && 'Your password has been reset successfully'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm">
                {error}
              </div>
            )}

            {step === 'email' && (
              <form onSubmit={emailForm.handleSubmit(onRequestOTP)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="business@example.com"
                    {...emailForm.register('email', {
                      required: 'Email is required',
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Invalid email address',
                      },
                    })}
                  />
                  {emailForm.formState.errors.email && (
                    <p className="text-sm text-red-600">{emailForm.formState.errors.email.message}</p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending OTP...
                    </span>
                  ) : (
                    <>
                      <Mail className="size-4 mr-2" />
                      Send OTP
                    </>
                  )}
                </Button>
              </form>
            )}

            {step === 'complete' && (
              <form onSubmit={completeForm.handleSubmit(onCompleteForgotPassword)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="business@example.com"
                    {...completeForm.register('email', {
                      required: 'Email is required',
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Invalid email address',
                      },
                    })}
                  />
                  {completeForm.formState.errors.email && (
                    <p className="text-sm text-red-600">{completeForm.formState.errors.email.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="otp">OTP</Label>
                  <Input
                    id="otp"
                    type="text"
                    placeholder="Enter the OTP sent to your email"
                    {...completeForm.register('otp', {
                      required: 'OTP is required',
                    })}
                  />
                  {completeForm.formState.errors.otp && (
                    <p className="text-sm text-red-600">{completeForm.formState.errors.otp.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">New Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter new password"
                    {...completeForm.register('password', {
                      required: 'Password is required',
                      minLength: {
                        value: 8,
                        message: 'Password must be at least 8 characters',
                      },
                    })}
                  />
                  {completeForm.formState.errors.password && (
                    <p className="text-sm text-red-600">{completeForm.formState.errors.password.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm new password"
                    {...completeForm.register('confirmPassword', {
                      required: 'Please confirm your password',
                    })}
                  />
                  {completeForm.formState.errors.confirmPassword && (
                    <p className="text-sm text-red-600">{completeForm.formState.errors.confirmPassword.message}</p>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Resetting Password...
                    </span>
                  ) : (
                    <>
                      <Lock className="size-4 mr-2" />
                      Reset Password
                    </>
                  )}
                </Button>
              </form>
            )}

            {step === 'success' && (
              <div className="space-y-6">
                <div className="flex flex-col items-center justify-center p-6 bg-green-50 border border-green-200 rounded-lg">
                  <div className="bg-green-100 p-4 rounded-full mb-4">
                    <CheckCircle className="size-12 text-green-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-green-900 mb-2">
                    Password Reset Successful!
                  </h3>
                  <p className="text-sm text-green-700 text-center mb-4">
                    Your password has been reset successfully. You can now login with your new password.
                  </p>
                </div>
                <Button
                  onClick={() => router.push('/')}
                  className="w-full"
                >
                  Go to Login
                </Button>
              </div>
            )}

            {step === 'email' && (
              <div className="mt-4 text-center">
                <Link 
                  href="/" 
                  className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                >
                  <ArrowLeft className="size-4" />
                  Back to Login
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default ForgotPassword