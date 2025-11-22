'use client'
import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { RegisterFormData } from '../type'
import { IoMdEye, IoMdEyeOff } from "react-icons/io"
import { API_END_POINT } from '../config/Api'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const Register = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false)
  const [registerError, setRegisterError] = useState("")
  const [registerSuccess, setRegisterSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>()

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true)
    setRegisterError("")
    
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
          platform_configs: {} 
        })
      })

      const result = await response.json()
      console.log('API Response:', result)
      
      if (response.ok) {
        // Registration successful
        setRegisterSuccess(true)
        router.push('/')
      } else {
        // Handle different error statuses
        if (response.status === 400) {
          setRegisterError(result.message || "Invalid registration data. Please check all fields.")
        } else if (response.status === 409) {
          setRegisterError("Email already exists")
        } else {
          setRegisterError(result.message || "Registration failed. Please try again.")
        }
      }
    } catch (err) {
      console.error('Registration error:', err)
      setRegisterError("Network error. Please check your connection.")
    } finally {
      setIsLoading(false)
    }
  }

  if (registerSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <div className="mb-6">
            <svg className="mx-auto h-12 w-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Successful!</h2>
          <p className="text-gray-600 mb-6">Your account has been created successfully.</p>
          <Link
            href="/"
            className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200 inline-block text-center"
          >
            Go to Login Page
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">
            Create Account
          </h2>
          <p className="mt-2 text-gray-600">
            Sign up to get started
          </p>
        </div>
        
        {/* Display error message */}
        {registerError && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
            {registerError}
          </div>
        )}
        
        <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
          {/* First Name and Last Name Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                First Name
              </label>
              <input
                {...register('firstName', {
                  required: 'First name is required',
                  minLength: {
                    value: 2,
                    message: 'First name must be at least 2 characters',
                  },
                })}
                id="firstName"
                name="firstName"
                type="text"
                autoComplete="given-name"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                placeholder="John"
              />
              {errors.firstName && (
                <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
              )}
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                Last Name
              </label>
              <input
                {...register('lastName', {
                  required: 'Last name is required',
                  minLength: {
                    value: 2,
                    message: 'Last name must be at least 2 characters',
                  },
                })}
                id="lastName"
                name="lastName"
                type="text"
                autoComplete="family-name"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                placeholder="Doe"
              />
              {errors.lastName && (
                <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
              )}
            </div>
          </div>

          {/* Phone Number Field */}
          <div>
            <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              {...register('phoneNumber', {
                required: 'Phone number is required',
                pattern: {
                  value: /^[\d\s\+\-\(\)]+$/,
                  message: 'Please enter a valid phone number',
                },
              })}
              id="phoneNumber"
              name="phoneNumber"
              type="tel"
              autoComplete="tel"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
              placeholder="+234 800 000 0000"
            />
            {errors.phoneNumber && (
              <p className="mt-1 text-sm text-red-600">{errors.phoneNumber.message}</p>
            )}
          </div>

          {/* Company Name Field */}
          <div>
            <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1">
              Company Name
            </label>
            <input
              {...register('companyName', {
                required: 'Company name is required',
                minLength: {
                  value: 2,
                  message: 'Company name must be at least 2 characters',
                },
              })}
              id="companyName"
              name="companyName"
              type="text"
              autoComplete="organization"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
              placeholder="Your Business Ltd"
            />
            {errors.companyName && (
              <p className="mt-1 text-sm text-red-600">{errors.companyName.message}</p>
            )}
          </div>

          {/* TIN Field */}
          <div>
            <label htmlFor="tin" className="block text-sm font-medium text-gray-700 mb-1">
              TIN
            </label>
            <input
              {...register('tin', {
                required: 'TIN is required',
                pattern: {
                  value: /^[\d\-]+$/,
                  message: 'Please enter a valid TIN',
                },
              })}
              id="tin"
              name="tin"
              type="text"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
              placeholder="12345678-0001"
            />
            {errors.tin && (
              <p className="mt-1 text-sm text-red-600">{errors.tin.message}</p>
            )}
          </div>

          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              {...register('email', {
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address',
                },
              })}
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
              placeholder="Enter your email"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          {/* Password Field */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className='relative'>
              <input
                {...register('password', {
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
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent pr-10"
                placeholder="Create a password"
              />
              <button 
                type="button" 
                className='absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600'
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <IoMdEyeOff size={20} /> : <IoMdEye size={20} />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>

          {/* Terms and Conditions Checkbox */}
          <div className="flex items-start">
            <input
              type="checkbox"
              id="agreeToTerms"
              className="mt-1 h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
              {...register('agreeToTerms', {
                required: 'You must agree to the Privacy Policy and Terms of Service',
              })}
            />
            <label htmlFor="agreeToTerms" className="ml-2 text-sm text-gray-700">
              I agree to the portal&apos;s{' '}
              <a href="#" className="text-red-600 hover:underline">Privacy Policy</a>
              {' '}and{' '}
              <a href="#" className="text-red-600 hover:underline">Terms of Service</a>
            </label>
          </div>
          {errors.agreeToTerms && (
            <p className="text-sm text-red-600">{errors.agreeToTerms.message}</p>
          )}

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
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
                  Creating account...
                </span>
              ) : (
                'Create Account'
              )}
            </button>
          </div>
        </form>

        {/* Login link */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link
              href="/"
              className="text-gray-600 hover:text-blue-500 font-medium"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Register