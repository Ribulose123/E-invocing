import React from 'react'

interface WelcomeModalProps {
  userName: string
  isOpen: boolean
  onClose: () => void
}
const WelcomeModal:React.FC<WelcomeModalProps>  = ({userName, isOpen, onClose}) => {
      if (!isOpen) return null
  return (
    <div className="fixed inset-0 bg-black/75 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3 text-center">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Welcome Back!</h3>
          <div className="mt-2 px-7 py-3">
            <p className="text-sm text-gray-500">
              Hello <strong className='text-black font-black'>{userName}</strong>, we&apos;re glad to see you again. Manage your invoices efficiently with our tools.
            </p>
          </div>
          <div className="items-center px-4 py-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-primary text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              Get Started
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WelcomeModal 
