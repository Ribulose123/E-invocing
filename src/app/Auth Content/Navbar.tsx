import React, { useState } from 'react'
import { User } from '../type'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { API_END_POINT } from '../config/Api'

interface NavbarProps {
  user: User | null
  onLogout?: () => void
}
const Navbar:React.FC<NavbarProps> = ({user, onLogout}) => {
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      const token = localStorage.getItem('authToken')
      
      // Call logout API if token exists
      if (token) {
        try {
          await fetch(API_END_POINT.AUTH.LOGOUT, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            }
          })
        } catch (error) {
          console.error('Logout API error:', error)
          // Continue with logout even if API call fails
        }
      }
      
      // Clear local storage
      localStorage.removeItem('authToken')
      localStorage.removeItem('userData')
      localStorage.removeItem('userBusinessId')
      localStorage.removeItem('businessIdSkipped')
      localStorage.removeItem('businessIdEntered')
      
      // Call custom logout handler if provided
      if (onLogout) {
        onLogout()
      } else {
        // Default: redirect to login
        router.push('/')
      }
    } catch (error) {
      console.error('Logout error:', error)
      // Still clear storage and redirect even on error
      localStorage.clear()
      router.push('/')
    } finally {
      setIsLoggingOut(false)
    }
  }
  return (
   <div className='bg-red-600 pt-1'>
     <nav className="bg-gray-700 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <h2  className="text-xl font-bold">
             Gention E-invoice
            </h2>
          </div>
          
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <span className="text-red-100">Welcome, {user.name}</span>
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="bg-red-500 hover:bg-red-800 px-3 py-2 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoggingOut ? 'Logging out...' : 'Logout'}
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-red-100 hover:text-white px-3 py-2 rounded-md text-sm font-medium">
                  Login
                </Link>
                <Link href="/register" className="bg-red-700 hover:bg-red-800 px-3 py-2 rounded-md text-sm font-medium">
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
   </div>
  )
}

export default Navbar
