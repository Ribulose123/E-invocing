'use client'
import React, { useState } from 'react'
import { useForm } from "react-hook-form";
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, ArrowLeft, Mail } from 'lucide-react';
import Link from 'next/link';
import { API_END_POINT } from '../config/Api';

interface ForgotPasswordFormData {
  email: string;
}

const ForgotPassword = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>();

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    setError("");
    setSuccess(false);
    
    try {
      const response = await fetch(API_END_POINT.AUTH.FORGOT_PASSWORD, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: data.email
        })
      });
      
      // Check if endpoint doesn't exist (404) or is not implemented (501)
      if (response.status === 404 || response.status === 501) {
        setError("Password reset feature is currently unavailable. Please contact support for assistance.");
        setIsLoading(false);
        return;
      }

      const result = await response.json();

      if (response.ok) {
        setSuccess(true);
      } else {
        if (response.status === 400) {
          setError(result.message || "Invalid email address. Please check and try again.");
        } else {
          setError(result.message || "Failed to send reset link. Please try again.");
        }
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      // Check if it's a network error (endpoint doesn't exist)
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        setError("Password reset feature is currently unavailable. The endpoint is not yet configured. Please contact support for assistance.");
      } else {
        setError("Network error. Please check your connection and try again.");
      }
    } finally {
      setIsLoading(false);
    }
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
            <CardTitle>Forgot Password</CardTitle>
            <CardDescription>
              Enter your email address and we'll send you a link to reset your password
            </CardDescription>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="space-y-4">
                <div className="flex flex-col items-center justify-center p-6 bg-green-50 border border-green-200 rounded-lg">
                  <div className="bg-green-100 p-3 rounded-full mb-4">
                    <Mail className="size-6 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-green-900 mb-2">
                    Check Your Email
                  </h3>
                  <p className="text-sm text-green-700 text-center mb-4">
                    We've sent a password reset link to your email address. Please check your inbox and follow the instructions to reset your password.
                  </p>
                  <p className="text-xs text-green-600 text-center">
                    Didn't receive the email? Check your spam folder or try again.
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={() => router.push('/')}
                    variant="outline"
                    className="w-full"
                  >
                    <ArrowLeft className="size-4 mr-2" />
                    Back to Login
                  </Button>
                  <Button
                    onClick={() => {
                      setSuccess(false);
                      setError("");
                    }}
                    className="w-full"
                  >
                    Send Another Email
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {error && (
                  <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm">
                    {error}
                  </div>
                )}
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="business@example.com"
                      {...register('email', {
                        required: 'Email is required',
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: 'Invalid email address',
                        },
                      })}
                    />
                    {errors.email && (
                      <p className="text-sm text-red-600">{errors.email.message}</p>
                    )}
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <span className="flex items-center justify-center">
                        <svg
                          className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Sending...
                      </span>
                    ) : (
                      'Send Reset Link'
                    )}
                  </Button>
                </form>
                <div className="mt-4 text-center">
                  <Link 
                    href="/" 
                    className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                  >
                    <ArrowLeft className="size-4" />
                    Back to Login
                  </Link>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default ForgotPassword

