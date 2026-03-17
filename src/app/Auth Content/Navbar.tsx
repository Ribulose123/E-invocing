import React, { useState, useRef, useEffect } from 'react'
import { User as UserType } from '../type'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { API_END_POINT } from '../config/Api'
import { BrandLogo } from '@/components/BrandLogo'
import { User, LogOut, ChevronDown, Pencil } from 'lucide-react'
import Image from 'next/image'
import { handleUnauthorized } from '../utils/authHelpers'

interface NavbarProps {
  user: UserType | null
  onEditProfile?: () => void
  onLogout?: () => void
}
const Navbar: React.FC<NavbarProps> = ({ user, onEditProfile, onLogout }) => {
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    if (userMenuOpen) {
      document.addEventListener('click', handleClickOutside)
    }
    return () => document.removeEventListener('click', handleClickOutside)
  }, [userMenuOpen])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      const token = localStorage.getItem('authToken')
      if (token) {
        try {
          await fetch(API_END_POINT.AUTH.LOGOUT, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          })
        } catch (error) {
          console.error('Logout API error:', error)
        }
      }

      // Use shared unauthorized handler to clear storage and redirect
      handleUnauthorized()

      // Call custom logout handler if provided (after redirect side-effects)
      if (onLogout) {
        onLogout()
      }
    } catch (error) {
      console.error('Logout error:', error)
      // As a fallback, also try to clear and redirect
      handleUnauthorized()
    } finally {
      setIsLoggingOut(false)
    }
  }
  return (
   <div className="bg-background pt-0">
     <nav className=" text-white shadow-lg border-b border-secondary/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Image src="/image/new_logo.png" alt="Nexar logo" width={100} height={0} />
          </div>
          
          <div className="flex items-center space-x-4">
            {user ? (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((o) => !o)}
                  className="flex items-center gap-2 text-white/90 hover:text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-white/10 transition-colors"
                  aria-expanded={userMenuOpen}
                  aria-haspopup="true"
                >
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-white/20">
                    <User className="w-4 h-4" />
                  </span>
                  <span className="hidden sm:inline">{user.name}</span>
                  <span>User</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-1 w-72 py-0 rounded-lg bg-white text-slate-900 shadow-lg border border-gray-200 z-50 overflow-hidden max-h-[85vh] flex flex-col">
                    <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/80 space-y-3 overflow-y-auto">
                      <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-1">User Profile</h3>
                      <div>
                        <label className="text-sm font-medium text-slate-500 uppercase">Email:</label>
                        <p className="text-sm text-slate-900 mt-1">{user.email || "—"}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-500 uppercase">Business ID:</label>
                        <p className="text-sm text-slate-900 mt-1 font-mono break-all">{user.business_id}</p>
                      </div>
                      <div>
                       {/*  <label className="text-xs font-medium text-slate-500 uppercase">TIN</label>
                        <p className="text-sm text-slate-900 mt-1">{user.tin || "—"}</p> */}
                      </div>
                      <div>
                       {/*  <label className="text-xs font-medium text-slate-500 uppercase">Company Name</label>
                        <p className="text-sm text-slate-900 mt-1">{user.companyName || "—"}</p> */}
                      </div>
                      <div>
                        {/* <label className="text-xs font-medium text-slate-500 uppercase">Phone Number</label>
                        <p className="text-sm text-slate-900 mt-1">{user.phoneNumber || "—"}</p> */}
                      </div>
                     {/*  <div>
                        <label className="text-xs font-medium text-slate-500 uppercase">User ID</label>
                        <p className="text-sm text-slate-900 mt-1 font-mono break-all">{user.id || "—"}</p>
                      </div> */}
                    </div>
                    <div className="py-1 border-t border-gray-100">
                      {onEditProfile && (
                        <button
                          type="button"
                          onClick={() => {
                            setUserMenuOpen(false)
                            onEditProfile()
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <Pencil className="w-4 h-4" />
                          Edit Profile
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setUserMenuOpen(false)
                          handleLogout()
                        }}
                        disabled={isLoggingOut}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <LogOut className="w-4 h-4" />
                        {isLoggingOut ? 'Logging out...' : 'Logout'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link href="/" className="text-white/90 hover:text-white px-3 py-2 rounded-md text-sm font-medium">
                  Login
                </Link>
                <Link href="/" className="bg-secondary hover:bg-secondary/90 px-3 py-2 rounded-md text-sm font-medium">
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
