import React from 'react'
import { User } from '../type'
import Link from 'next/link'

interface NavbarProps {
  user: User | null
  onLogout: () => void
}
const Navbar:React.FC<NavbarProps> = ({user, onLogout}) => {
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
                  onClick={onLogout}
                  className="bg-red-500 hover:bg-red-800 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Logout
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
