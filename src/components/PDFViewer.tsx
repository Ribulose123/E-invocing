'use client'

import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set up the worker
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
}

interface PDFViewerProps {
  file: string;
  pageNumber: number;
  width: number;
  onLoadSuccess: (data: { numPages: number }) => void;
}

export function PDFViewer({ file, pageNumber, width, onLoadSuccess }: PDFViewerProps) {
  return (
    <Document 
      file={file} 
      onLoadSuccess={onLoadSuccess}
      loading={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      }
    >
      <Page pageNumber={pageNumber} width={width} />
    </Document>
  );
}

