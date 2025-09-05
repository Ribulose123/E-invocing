import React from 'react'
import { User } from '../type'
import Link from 'next/link'

interface NavbarProps {
  user: User | null
  onLogout: () => void
}
const Navbar:React.FC<NavbarProps> = ({user, onLogout}) => {
  return (
    <nav className="bg-blue-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold">
              InvoiceManager
            </Link>
          </div>
          
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <span className="text-blue-100">Welcome, {user.name}</span>
                <button
                  onClick={onLogout}
                  className="bg-blue-700 hover:bg-blue-800 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-blue-100 hover:text-white px-3 py-2 rounded-md text-sm font-medium">
                  Login
                </Link>
                <Link href="/register" className="bg-blue-700 hover:bg-blue-800 px-3 py-2 rounded-md text-sm font-medium">
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
