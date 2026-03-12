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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2 } from 'lucide-react';
import { BrandLogo } from "@/components/BrandLogo";
import Link from 'next/link';
import { useToast } from '@/components/ui/toaster';

const Login = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [registerError, setRegisterError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
  const [registrationDetails, setRegistrationDetails] = useState<RegisterFormData | null>(null);
  const router = useRouter();
  const { addToast } = useToast();
  
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
    reset: resetSignup,
    watch: watchSignup,
    setValue: setSignupValue,
  } = useForm<RegisterFormData>({
    defaultValues: {
      is_aggregator: false, // Default to company registration
    },
  });
  
  const selectedAccountType = watchSignup('is_aggregator');

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setLoginError("");
    
    try {
      // Get is_aggregator from localStorage if available (from previous session)
      let isAggregator = false;
      try {
        const storedUserData = localStorage.getItem('userData');
        if (storedUserData) {
          const parsedUser = JSON.parse(storedUserData);
          isAggregator = parsedUser.is_aggregator || false;
        }
      } catch (e) {
        // If parsing fails, default to false
        isAggregator = false;
      }

      const loginBody = {
        email: data.email,
        password: data.password,
        is_sandbox: true,
        is_aggregator: isAggregator
      };

      // Console log login request body
      console.log('🔑 Login Request Body:', loginBody);

      const response = await fetch(API_END_POINT.AUTH.LOGIN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginBody)
      });
      
      const result = await response.json();

      if (response.ok) {
        // Based on the API response structure:
        // - result.data is another response object with {status, status_code, message, data, access_token}
        // - access_token is in result.data.access_token
        // - user data is in result.data.data: {id, email, name, business_id}
        const token = result.data?.access_token || result.access_token;
        const user = result.data?.data; // User data is in result.data.data
        
        if (token) {
          localStorage.setItem("authToken", token);
        } else {
          alert('No authentication token received from server!');
          setLoginError('No authentication token received');
          return;
        }
        
        // Check if user exists and is an object (not null/undefined)
        if (user && typeof user === 'object' && !Array.isArray(user)) {
          // Try to get id from various possible field names
          const userId = (user as any).id || (user as any).user_id || (user as any)._id || (user as any).ID;
          
          // Console log raw API response for debugging
          console.log('🔐 Login API Response:', {
            fullResponse: result,
            userFromAPI: user,
            userKeys: Object.keys(user),
          });

          // Map API response fields to User interface format
          const mappedUser = {
            id: userId || (user as any).id, // Ensure id is always present
            email: user.email || (user as any).email || '',
            name: user.name || (user as any).name || '',
            business_id: user.business_id || (user as any).business_id || '',
            // Map snake_case to camelCase if API returns snake_case
            companyName: user.companyName || (user as any).company_name,
            tin: user.tin || (user as any).tin_number,
            phoneNumber: user.phoneNumber || (user as any).phone_number,
            is_sandbox: (user as any).is_sandbox !== undefined ? (user as any).is_sandbox : true,
            is_aggregator: (user as any).is_aggregator !== undefined ? (user as any).is_aggregator : false,
          };
          
          // Console log mapped user before saving
          console.log('👤 Mapped User (Login):', {
            mappedUser,
            willBeSavedToLocalStorage: mappedUser,
          });
          
          // Ensure we have at least an id before saving
          if (!mappedUser.id) {
            alert(`User object missing ID field!\n\nUser object keys: ${Object.keys(user).join(', ')}\n\nFull object: ${JSON.stringify(user, null, 2)}`);
            setLoginError('Invalid user data received from server');
            return;
          }
          
          localStorage.setItem("userData", JSON.stringify(mappedUser));
          
          // Console log what was saved to localStorage
          console.log('💾 Saved to localStorage:', {
            userData: JSON.parse(localStorage.getItem("userData") || '{}'),
          });
        } else {
          alert(`No user data received from server!\n\nResponse structure:\n${JSON.stringify(result, null, 2)}`);
          setLoginError('No user data received from server');
          return;
        }
        
        // Show success toast
        addToast({
          variant: "success",
          title: "Login Successful",
          description: "Welcome back! Redirecting to dashboard...",
        });
        
        // ALWAYS redirect to dashboard after successful login
        // The dashboard will handle business ID check
        // Use window.location for a hard redirect to ensure clean state
        window.location.href = '/dashboard';
        
      } else if (response.status === 400) {
        const errorMsg = "Incorrect email or password, please recheck credentials.";
        setLoginError(errorMsg);
        addToast({
          variant: "error",
          title: "Login Failed",
          description: errorMsg,
        });
        resetLogin({ password: "" });
      } else if (response.status === 401) {
        const errorMsg = "Invalid credentials. Please try again.";
        setLoginError(errorMsg);
        addToast({
          variant: "error",
          title: "Login Failed",
          description: errorMsg,
        });
      } else {
        const errorMsg = result.message || "Login failed";
        throw new Error(errorMsg);
      }
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "An unexpected error occurred";
      setLoginError(errorMsg);
      addToast({
        variant: "error",
        title: "Login Error",
        description: errorMsg,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onSignupSubmit = async (data: RegisterFormData) => {
    setRegisterLoading(true);
    setRegisterError("");
    
    try {
      const fullName = `${data.firstName} ${data.lastName}`;
      
      const { agreeToTerms: _agreeToTerms, confirmPassword: _confirmPassword, ...backendData } = data;
      void _agreeToTerms;
      void _confirmPassword;
      
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
          company_name: backendData.companyName, 
          phone_number: backendData.phoneNumber,
          is_aggregator: backendData.is_aggregator ?? false,
          is_sandbox: true,
          platform_configs: {} 
        })
      });

      const result = await response.json();
      
      // Console log registration API response
      console.log('📝 Registration API Response:', {
        fullResponse: result,
        resultData: result.data,
        resultDataKeys: result.data ? Object.keys(result.data) : [],
      });
      
      if (response.ok) {
        // Show success toast
        addToast({
          variant: "success",
          title: "Registration Successful",
          description: "Your account has been created successfully.",
        });
        
        // Store user data from API response if available
        const resultData = result.data;
        if (resultData) {
          const mappedUser = {
            id: resultData.id || '',
            email: resultData.email || data.email,
            name: resultData.name || `${data.firstName} ${data.lastName}`,
            business_id: resultData.business_id || '',
            companyName: resultData.company_name || data.companyName,
            tin: resultData.tin || data.tin,
            phoneNumber: resultData.phone_number || data.phoneNumber,
            is_sandbox: resultData.is_sandbox !== undefined ? resultData.is_sandbox : true,
            is_aggregator: resultData.is_aggregator !== undefined ? resultData.is_aggregator : data.is_aggregator || false,
          };
          
          // Console log mapped user from registration
          console.log('👤 Mapped User (Registration):', {
            mappedUser,
            registrationFormData: data,
          });
          
          // Save user data to localStorage
          localStorage.setItem("userData", JSON.stringify(mappedUser));
          
          // Console log what was saved
          console.log('💾 Saved to localStorage (Registration):', {
            userData: JSON.parse(localStorage.getItem("userData") || '{}'),
          });
          
          // If there's an access token, save it
          if (result.access_token) {
            localStorage.setItem("authToken", result.access_token);
          }
        }
        
        // Store registration details to show in modal
        setRegistrationDetails(data);
        setRegisterError("");
        // Reset the registration form
        resetSignup();
        // Show success modal instead of redirecting
        setShowSuccessModal(true);
      } else {
        let errorMsg = "";
        if (response.status === 400) {
          errorMsg = result.message || "Invalid registration data. Please check all fields.";
        } else if (response.status === 409) {
          errorMsg = "Email already exists";
        } else {
          errorMsg = result.message || "Registration failed. Please try again.";
        }
        setRegisterError(errorMsg);
        addToast({
          variant: "error",
          title: "Registration Failed",
          description: errorMsg,
        });
      }
    } catch (err) {
      const errorMsg = "Network error. Please check your connection.";
      setRegisterError(errorMsg);
      addToast({
        variant: "error",
        title: "Registration Error",
        description: errorMsg,
      });
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleGoToDashboard = () => {
    setShowSuccessModal(false);
    // Clear registration form
    setRegistrationDetails(null);
    // Redirect to dashboard
    window.location.href = '/dashboard';
  };
  
  const handleGoToLogin = () => {
    setShowSuccessModal(false);
    // Switch to login tab
    setActiveTab("login");
    // Clear registration form
    setRegistrationDetails(null);
  };

  return (
    <>
      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={(open) => {
        // Only allow closing via button click, not by clicking outside
        if (!open) {
          // User is trying to close - only allow if handleGoToLogin was called
          return;
        }
        setShowSuccessModal(open);
      }}>
        <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-green-100 p-3">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <DialogTitle className="text-center text-2xl">Sign Up Successful!</DialogTitle>
            <DialogDescription className="text-center text-base mt-2">
              Your account has been created successfully. You can proceed to the dashboard or login page.
            </DialogDescription>
          </DialogHeader>
          
          {/* Registration Details */}
          {registrationDetails && (
            <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <h4 className="text-sm font-semibold text-white mb-3">Registration Details:</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/70">Name:</span>
                  <span className="text-white font-medium">
                    {registrationDetails.firstName} {registrationDetails.lastName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">Email:</span>
                  <span className="text-white font-medium">{registrationDetails.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">Company:</span>
                  <span className="text-white font-medium">{registrationDetails.companyName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">TIN:</span>
                  <span className="text-white font-medium">{registrationDetails.tin}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">Phone:</span>
                  <span className="text-white font-medium">{registrationDetails.phoneNumber}</span>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="sm:justify-center mt-4 gap-2 flex-col sm:flex-row">
            <Button onClick={handleGoToDashboard} className="w-full sm:w-auto">
              Go to Dashboard
            </Button>
            <Button 
              variant="outline" 
              onClick={handleGoToLogin} 
              className="w-full sm:w-auto"
            >
              Go to Login
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex items-center justify-center min-h-screen p-4 bg-auth-gradient relative">
        <div className="w-full max-w-md relative z-10">
        <div className="flex items-center justify-center gap-2 mb-8">
          <BrandLogo blendWithBackground />
        </div>

        <Card className="border border-white/10 shadow-2xl backdrop-blur-md bg-white/95 text-slate-900">
          <CardHeader>
            <CardTitle className='text-primary'>Welcome</CardTitle>
            <CardDescription>Sign in to your account or create a new one</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
                    <Label htmlFor="login-email" className='text-primary'>Email</Label>
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
                    <Label htmlFor="login-password" className='text-primary'>Password</Label>
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
                         className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
                  <div className="space-y-2">
                    <Label htmlFor="signup-accountType" className='text-primary'>Account Type</Label>
                    <Select
                      value={selectedAccountType ? 'aggregator' : 'company'}
                      onValueChange={(value) => {
                        setSignupValue('is_aggregator', value === 'aggregator');
                      }}
                    >
                      <SelectTrigger id="signup-accountType">
                        <SelectValue placeholder="Select account type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="company">Company</SelectItem>
                        <SelectItem value="aggregator">Aggregator</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-500">
                      {selectedAccountType 
                        ? 'Registering as an aggregator account' 
                        : 'Registering as a company account'}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-firstName" className='text-primary'  >First Name</Label>
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
                      <Label htmlFor="signup-lastName" className='text-primary'   >Last Name</Label>
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
                    <Label htmlFor="signup-phoneNumber" className='text-primary'   >Phone Number</Label>
                    <Input
                      id="signup-phoneNumber"
                      type="tel"
                      placeholder="0800 000 0000"
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
                    <Label htmlFor="signup-companyName" className='text-primary'>Company Name</Label>
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
                    <Label htmlFor="signup-tin" className='text-primary'>TIN</Label>
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
                    <Label htmlFor="signup-email" className='text-primary'>Email</Label>
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
                    <Label htmlFor="signup-password" className='text-primary'>Password</Label>
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
                  <div className="space-y-2">
                    <Label htmlFor="signup-confirmPassword" className='text-primary'>Confirm Password</Label>
                    <div className="relative">
                      <Input
                        id="signup-confirmPassword"
                        type={showRegisterPassword ? "text" : "password"}
                        placeholder="Confirm your password"
                        {...registerSignup('confirmPassword', {
                          required: 'Please confirm your password',
                          validate: (value) => {
                            const password = watchSignup('password');
                            return value === password || 'Passwords do not match';
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
                    {signupErrors.confirmPassword && (
                      <p className="text-sm text-red-600">{signupErrors.confirmPassword.message}</p>
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
                    <Label htmlFor="signup-agreeToTerms" className="text-sm font-normal cursor-pointer block text-primary">
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
    </>
  )
}

export default Login