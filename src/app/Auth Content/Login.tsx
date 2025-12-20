'use client'
import React, { useState } from 'react'
import { useForm } from "react-hook-form";
import { LoginFormData, RegisterFormData } from '../type';
import { API_END_POINT } from '../config/Api';
import { IoMdEye, IoMdEyeOff } from "react-icons/io"
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText } from 'lucide-react';
import Link from 'next/link';

const Login = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [registerError, setRegisterError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const route = useRouter();
  
  const {
    register: registerLogin,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors },
    reset: resetLogin,
  } = useForm<LoginFormData>();

  const {
    register: registerSignup,
    handleSubmit: handleSignupSubmit,
    formState: { errors: signupErrors },
  } = useForm<RegisterFormData>();

  
  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setLoginError("");
    
    try {
      
      const response = await fetch(API_END_POINT.AUTH.LOGIN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password
        })
      });
      
      const result = await response.json();

      if (response.ok) {
        const token = result.data?.access_token;
        const user = result.data?.user;
        
        if (token) {
          localStorage.setItem("authToken", token);
        }
        
        if (user) {
          localStorage.setItem("userData", JSON.stringify(user));
        }
        
        route.push('/dashboard');
        
      } else if (response.status === 400) {
        setLoginError("Incorrect email or password, please recheck credentials.");
        resetLogin({ password: "" });
      } else if (response.status === 401) {
        setLoginError("Invalid credentials. Please try again.");
      } else {
        throw new Error(result.message || "Login failed");
      }
      
    } catch (error) {
      console.error('Login error:', error);
      setLoginError(error instanceof Error ? error.message : "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const onSignupSubmit = async (data: RegisterFormData) => {
    setRegisterLoading(true);
    setRegisterError("");
    
    try {
      // Combine first name and last name for the name field
      const fullName = `${data.firstName} ${data.lastName}`;
      
      // Prepare data to send to backend (excluding agreeToTerms)
      // agreeToTerms is validated but not sent to backend
      const { agreeToTerms: _agreeToTerms, ...backendData } = data;
      void _agreeToTerms; // Suppress unused variable warning
      
      const response = await fetch(API_END_POINT.AUTH.REGISTER, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: backendData.email,
          name: fullName,
          password: backendData.password,
          tin: backendData.tin,
          phoneNumber: backendData.phoneNumber,
          companyName: backendData.companyName,
          platform_configs: {} 
        })
      });

      const result = await response.json();
      console.log('API Response:', result);
      
      if (response.ok) {
        // Registration successful - redirect to login tab or show success message
        setRegisterError("");
        route.push('/');
      } else {
        // Handle different error statuses
        if (response.status === 400) {
          setRegisterError(result.message || "Invalid registration data. Please check all fields.");
        } else if (response.status === 409) {
          setRegisterError("Email already exists");
        } else {
          setRegisterError(result.message || "Registration failed. Please try again.");
        }
      }
    } catch (err) {
      console.error('Registration error:', err);
      setRegisterError("Network error. Please check your connection.");
    } finally {
      setRegisterLoading(false);
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
            <CardTitle>Welcome</CardTitle>
            <CardDescription>Sign in to your account or create a new one</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                {loginError && (
                  <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm">
                    {loginError}
                  </div>
                )}
                <form onSubmit={handleLoginSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="business@example.com"
                      {...registerLogin('email', {
                        required: 'Email is required',
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: 'Invalid email address',
                        },
                      })}
                    />
                    {loginErrors.email && (
                      <p className="text-sm text-red-600">{loginErrors.email.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        {...registerLogin('password', {
                          required: 'Password is required',
                          minLength: {
                            value: 6,
                            message: 'Password must be at least 6 characters',
                          },
                        })}
                        className="pr-10"
                      />
                      <button 
                        type="button" 
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <IoMdEyeOff size={20} /> : <IoMdEye size={20} />}
                      </button>
                    </div>
                    {loginErrors.password && (
                      <p className="text-sm text-red-600">{loginErrors.password.message}</p>
                    )}
                  </div>
                  <div className="flex justify-end">
                    <Link 
                      href="/forgot-password" 
                      className="text-sm text-primary hover:underline"
                    >
                      Forgot Password?
                    </Link>
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
                        Signing in...
                      </span>
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup">
                {registerError && (
                  <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm">
                    {registerError}
                  </div>
                )}
                <form onSubmit={handleSignupSubmit(onSignupSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-firstName">First Name</Label>
                      <Input
                        id="signup-firstName"
                        type="text"
                        placeholder="John"
                        {...registerSignup('firstName', {
                          required: 'First name is required',
                          minLength: {
                            value: 2,
                            message: 'First name must be at least 2 characters',
                          },
                        })}
                      />
                      {signupErrors.firstName && (
                        <p className="text-sm text-red-600">{signupErrors.firstName.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-lastName">Last Name</Label>
                      <Input
                        id="signup-lastName"
                        type="text"
                        placeholder="Doe"
                        {...registerSignup('lastName', {
                          required: 'Last name is required',
                          minLength: {
                            value: 2,
                            message: 'Last name must be at least 2 characters',
                          },
                        })}
                      />
                      {signupErrors.lastName && (
                        <p className="text-sm text-red-600">{signupErrors.lastName.message}</p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-phoneNumber">Phone Number</Label>
                    <Input
                      id="signup-phoneNumber"
                      type="tel"
                      placeholder="+234 800 000 0000"
                      {...registerSignup('phoneNumber', {
                        required: 'Phone number is required',
                        pattern: {
                          value: /^[\d\s\+\-\(\)]+$/,
                          message: 'Please enter a valid phone number',
                        },
                      })}
                    />
                    {signupErrors.phoneNumber && (
                      <p className="text-sm text-red-600">{signupErrors.phoneNumber.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-companyName">Company Name</Label>
                    <Input
                      id="signup-companyName"
                      type="text"
                      placeholder="Your Business Ltd"
                      {...registerSignup('companyName', {
                        required: 'Company name is required',
                        minLength: {
                          value: 2,
                          message: 'Company name must be at least 2 characters',
                        },
                      })}
                    />
                    {signupErrors.companyName && (
                      <p className="text-sm text-red-600">{signupErrors.companyName.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-tin">TIN</Label>
                    <Input
                      id="signup-tin"
                      type="text"
                      placeholder="12345678-0001"
                      {...registerSignup('tin', {
                        required: 'TIN is required',
                        pattern: {
                          value: /^[\d\-]+$/,
                          message: 'Please enter a valid TIN',
                        },
                      })}
                    />
                    {signupErrors.tin && (
                      <p className="text-sm text-red-600">{signupErrors.tin.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="business@example.com"
                      {...registerSignup('email', {
                        required: 'Email is required',
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: 'Invalid email address',
                        },
                      })}
                    />
                    {signupErrors.email && (
                      <p className="text-sm text-red-600">{signupErrors.email.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        type={showRegisterPassword ? "text" : "password"}
                        placeholder="Create a password"
                        {...registerSignup('password', {
                          required: 'Password is required',
                          minLength: {
                            value: 8,
                            message: 'Password must be at least 8 characters',
                          },
                          pattern: {
                            value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                            message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
                          },
                        })}
                        className="pr-10"
                      />
                      <button 
                        type="button" 
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                      >
                        {showRegisterPassword ? <IoMdEyeOff size={20} /> : <IoMdEye size={20} />}
                      </button>
                    </div>
                    {signupErrors.password && (
                      <p className="text-sm text-red-600">{signupErrors.password.message}</p>
                    )}
                  </div>
                  <div className="flex items-start space-x-2">
                    <input
                      type="checkbox"
                      id="signup-agreeToTerms"
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary focus:ring-offset-0"
                      {...registerSignup('agreeToTerms', {
                        required: 'You must agree to the Privacy Policy and Terms of Service',
                      })}
                    />
                    <Label htmlFor="signup-agreeToTerms" className="text-sm font-normal cursor-pointer block">
                      <span className="block">I agree to the portal&apos;s</span>
                      <div className="block mt-1">
                        <a href="#" className="text-primary hover:underline">Privacy Policy</a>
                        <span className="mx-1">and</span>
                        <a href="#" className="text-primary hover:underline">Terms of Service</a>
                      </div>
                    </Label>
                  </div>
                  {signupErrors.agreeToTerms && (
                    <p className="text-sm text-red-600">{signupErrors.agreeToTerms.message}</p>
                  )}
                  <Button type="submit" className="w-full" disabled={registerLoading}>
                    {registerLoading ? (
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
                        Creating account...
                      </span>
                    ) : (
                      'Create Account'
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Login