import React from 'react'

interface UploadSectionProps {
  onUploadClick: () => void
}
const UploadSection = ({onUploadClick}:UploadSectionProps) => {
  return (
   <div className="px-4 py-6 sm:px-0">
      <div className="border-4 border-dashed border-gray-200 rounded-lg p-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Upload Your Invoice</h2>
        <p className="text-gray-500 mb-6">
          Upload your JSON invoice file to process and track it in our system.
        </p>
        <button
          onClick={onUploadClick}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Upload Invoice
        </button>
      </div>
    </div>
  )
}

export default UploadSection
