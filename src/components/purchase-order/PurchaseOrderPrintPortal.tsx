import React from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Download, Printer } from 'lucide-react';
import PoPrintSlip from '../PoPrintSlip';
import { downloadPoPdfFile } from '../../utils/purchaseOrderPdfGenerator';

interface PurchaseOrderPrintPortalProps {
  printingPo: any | null;
  onClose: () => void;
  onDownloadPdf?: (po: any) => void;
}

export const PurchaseOrderPrintPortal: React.FC<PurchaseOrderPrintPortalProps> = ({
  printingPo,
  onClose,
  onDownloadPdf
}) => {
  if (!printingPo) return null;

  const handleDownload = () => {
    if (onDownloadPdf) {
      onDownloadPdf(printingPo);
    } else {
      downloadPoPdfFile(printingPo);
    }
  };

  const portalModal = (
    <div className="fixed inset-0 z-[200] bg-[#525659] flex flex-col print:bg-white print:static print:z-auto print-modal">
      <style>{`
        @media print {
          #root {
             display: none !important;
          }
          .no-print {
             display: none !important;
          }
          html, body {
             height: auto !important;
             min-height: 0 !important;
             overflow: visible !important;
             max-height: none !important;
             background: white !important;
             border: none !important;
             box-shadow: none !important;
             padding: 0 !important;
             margin: 0 !important;
          }
          .print-modal {
             position: static !important;
             background: white !important;
             box-shadow: none !important;
             border: none !important;
             margin: 0 !important;
             padding: 0 !important;
             width: 100% !important;
             height: auto !important;
          }
          @page {
             size: A5 portrait;
             margin: 0;
          }
        }
      `}</style>
      
      {/* Viewer Toolbar */}
      <div className="flex-none bg-[#323639] shadow-md px-6 py-3 flex justify-between items-center no-print text-white text-xs">
        <div className="flex items-center gap-4">
           <button 
             onClick={onClose} 
             className="p-2 text-gray-300 hover:bg-white/10 rounded-full transition cursor-pointer"
             title="Back to Register"
           >
             <ArrowLeft className="w-5 h-5" />
           </button>
           <span className="font-bold tracking-wider uppercase">Purchase_Order_#{printingPo.ptf_no || printingPo.no}.pdf</span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleDownload} 
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded shadow flex items-center gap-2 font-bold transition cursor-pointer"
            title="Download official PDF Document"
          >
            <Download className="w-4 h-4" /> Download PDF Slip
          </button>
          <button 
            onClick={() => window.print()} 
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded shadow flex items-center gap-2 font-bold transition cursor-pointer"
            title="Print Document"
          >
             <Printer className="w-4 h-4" /> Print Document (A4 Half Vertical)
          </button>
        </div>
      </div>

      {/* Scrollable Canvas */}
      <div className="flex-1 overflow-y-auto p-4 flex justify-center print:p-0 print:overflow-visible">
         <PoPrintSlip po={printingPo} />
      </div>
    </div>
  );

  return createPortal(portalModal, document.body);
};
