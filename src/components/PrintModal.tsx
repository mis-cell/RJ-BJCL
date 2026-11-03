import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Printer, Mail, Send, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { getApiUrl } from '../lib/utils';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

// Capture the on-screen slip element and return it as a base64 PDF (no data-URI
// prefix), so any print-preview slip can be emailed as a real PDF attachment.
async function slipElementToPdfBase64(el: HTMLElement): Promise<string> {
  try {
    const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgW = pageWidth;
    const imgH = (canvas.height * pageWidth) / canvas.width;

    let heightLeft = imgH;
    let position = 0;
    pdf.addImage(imgData, 'PNG', 0, position, imgW, imgH);
    heightLeft -= pageHeight;
    while (heightLeft > 0) {
      position -= pageHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgW, imgH);
      heightLeft -= pageHeight;
    }
    return pdf.output('datauristring').split(',')[1] || '';
  } catch (err) {
    console.error('Slip-to-PDF failed:', err);
    return '';
  }
}

interface PrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  showTip?: boolean;
  copyType?: string | null;
  setCopyType?: (val: any) => void;
  onPrint?: () => void | Promise<void>;
  customPrintHandler?: () => void | Promise<void>;
  customPdfBase64?: string;
  extraActions?: React.ReactNode;
  hideActionBar?: boolean;
}

export default function PrintModal({ isOpen, onClose, title, children, showTip = true, copyType, setCopyType, onPrint, customPrintHandler, customPdfBase64, extraActions, hideActionBar = false }: PrintModalProps) {
  const [emailRecipient, setEmailRecipient] = useState("");
  const [emailSubject, setEmailSubject] = useState(`[Bally Jute ERP] ${title}`);
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [emailErrorMsg, setEmailErrorMsg] = useState("");
  const [showEmailPanel, setShowEmailPanel] = useState(false);

  // Listen to Escape key to close the modal
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSendEmail = async () => {
    if (!emailRecipient.trim()) {
      alert("Please enter at least one recipient email address.");
      return;
    }

    setEmailStatus('sending');
    setEmailErrorMsg("");

    try {
      // Find the printable canvas element
      const canvasEl = document.getElementById("print-modal-children-canvas");
      let canvasHtml = "";
      if (canvasEl) {
        // Clone and sanitize elements with classes to ensure inline compatibility in emails
        const cloned = canvasEl.cloneNode(true) as HTMLElement;
        
        // Remove any embedded PDF iframe or no-print elements from email HTML body
        cloned.querySelectorAll("iframe, .no-print, .pdf-embed-container").forEach((el) => el.remove());

        // Remove input borders or styled wrappers that might look bad in email client
        const inputs = cloned.querySelectorAll("input, textarea, select");
        inputs.forEach((inp: any) => {
          const span = document.createElement("span");
          span.textContent = inp.value || inp.innerText || "";
          span.style.fontWeight = "bold";
          span.style.borderBottom = "1px dotted #000";
          inp.parentNode?.replaceChild(span, inp);
        });

        canvasHtml = cloned.innerHTML;
      } else {
        canvasHtml = `<p>Bally Jute Document: ${title}</p>`;
      }

      // Format a high-fidelity retro email body wrapping the inner canvas HTML
      const fullHtmlBody = `
        <div style="font-family: Arial, Helvetica, sans-serif; background-color: #f6f6f6; padding: 24px; color: #111;">
          <div style="max-width: 820px; margin: 0 auto; background: #ffffff; border: 1px solid #ccc; box-shadow: 0 4px 6px rgba(0,0,0,0.05); padding: 24px; border-radius: 4px;">
            <div style="background-color: #2a3088; color: #ffffff; padding: 12px 16px; font-weight: bold; font-size: 14px; margin-bottom: 20px; border-radius: 2px;">
              BALLY JUTE COMPANY LIMITED - DIGITAL PO & DOCUMENTS DESK
            </div>
            
            <p style="font-size: 13px; line-height: 1.5; color: #555; margin-bottom: 20px;">
              Hello,<br/>
              Please find the official document <strong>"${title}"</strong> attached/formatted below. This was sent directly from our registered mail <a href="mailto:rawjute@ballyjute.com">rawjute@ballyjute.com</a>.
            </p>

            <div style="border: 2px solid #333; padding: 15px; background-color: #ffffff;">
              ${canvasHtml}
            </div>

            <div style="margin-top: 30px; border-top: 1px solid #ddd; padding-top: 15px; font-size: 11px; color: #888; text-align: center;">
              This is a secure, automated document transmission from Bally Jute ERP Desk. <br/>
              Registered Email ID: rawjute@ballyjute.com | System Time: ${new Date().toLocaleString()}
            </div>
          </div>
        </div>
      `;

      // Use custom template-generated PDF base64 when provided, otherwise capture on-screen slip
      const pdfBase64 = customPdfBase64 || (canvasEl ? await slipElementToPdfBase64(canvasEl) : "");
      const safeName = (title || "Document").replace(/[^a-z0-9]+/gi, "_");

      // Trigger the backend email sender
      const response = await fetch(getApiUrl("/api/send-email"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: emailRecipient,
          subject: emailSubject,
          html: fullHtmlBody,
          filename: `${safeName}.pdf`,
          pdfData: pdfBase64 || undefined,
        }),
      });

      const resText = await response.text();
      let resData;
      try {
        resData = JSON.parse(resText);
      } catch (e) {
        throw new Error("Mail Dispatch Failed: " + (resText.substring(0, 100) || `Status ${response.status}`));
      }

      if (!response.ok || !resData.success) {
        throw new Error(resData.error || "Unknown server error sending email.");
      }

      setEmailStatus('success');
      setTimeout(() => {
        // Automatically hide panel on success after a short delay
        setShowEmailPanel(false);
        setEmailStatus('idle');
      }, 3000);

    } catch (err: any) {
      console.error("Email send failed:", err);
      setEmailStatus('error');
      setEmailErrorMsg(err.message || "Failed to transmit email through SMTP servers.");
    }
  };

  return createPortal(
    <div 
      id="print-modal-backdrop" 
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[250] flex items-start justify-center p-4 overflow-y-auto print:bg-white print:static print:z-auto print:p-0 print:overflow-visible"
    >
      <div 
        id="print-modal-inner" 
        className="w-full max-w-[1250px] bg-[#FBCFCB] border-2 border-white shadow-[3px_3px_10px_rgba(0,0,0,0.6)] flex flex-col my-4 sm:my-6 print:my-0 print:border-none print:shadow-none"
      >
        {/* Top Retro Menubar */}
        <div className="bg-[#2a3088] text-white px-3 py-1.5 flex justify-between items-center text-xs font-black  border-b border-white no-print">
          <span className="flex items-center gap-1">
            <Printer className="w-4 h-4 text-cyan-200" /> {title}
          </span>
          <button 
            type="button"
            onClick={onClose}
            className="bg-red-600 border border-white hover:bg-red-700 text-white px-2 py-0.5 rounded text-[10px] uppercase font-black tracking-wide cursor-pointer"
          >
            Close (ESC)
          </button>
        </div>

        {/* Print Controls / Tip Strip */}
        {!hideActionBar && (
          <div className="bg-[#f0ece4] p-3 border-b border-gray-400 text-[11px] font-semibold text-gray-800 flex justify-between items-center flex-wrap gap-2 no-print">
            {showTip ? (
              <div className="flex flex-col">
                <p className="text-red-800 font-extrabold flex items-center gap-1 text-xs">
                  💡 Double-Check & Adjust Values On Screen!
                </p>
                <p className="text-gray-500 mt-0.5 max-w-[650px] leading-tight font-sans font-medium">
                  All cells in the report table, supplier, order numbers, dates, and remarks are completely editable. Overwrite values directly; calculations updating Net Wt. occur automatically before physical print.
                </p>
              </div>
            ) : (
              <div></div>
            )}
            <div className="flex gap-1.5 ml-auto">
              {extraActions}
              {setCopyType && (
                <select 
                  value={copyType || "1"} 
                  onChange={(e) => setCopyType?.(e.target.value)} 
                  className="h-8 border border-gray-400 bg-white px-2 text-xs font-bold text-gray-800 shadow-[1px_1px_0_0_rgba(0,0,0,0.3)] cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="1">Mill Copy</option>
                  <option value="2">Original Copy</option>
                  <option value="3">Not for Bill</option>
                </select>
              )}
              <button 
                type="button"
                onClick={() => setShowEmailPanel(!showEmailPanel)}
                className={`border shadow-[1px_1px_0_0_rgba(0,0,0,0.3)] px-3 text-xs font-black h-8 flex items-center gap-1.5 cursor-pointer transition ${
                  showEmailPanel 
                    ? "bg-indigo-700 text-white border-indigo-950" 
                    : "bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border-indigo-300"
                }`}
              >
                <Mail className="w-4 h-4" /> 
                {showEmailPanel ? "HIDE EMAIL PANEL" : "📧 EMAIL THIS SLIP (1-CLICK)"}
              </button>
              <button 
                type="button"
                onClick={onClose}
                className="bg-white border border-gray-400 hover:bg-gray-100 shadow-[1px_1px_0_0_rgba(0,0,0,0.3)] px-3 text-xs font-bold h-8 text-gray-700 cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={async () => {
                  if (onPrint) {
                    try {
                      await onPrint();
                    } catch (e) {
                      console.warn("Print action callback failed:", e);
                    }
                  }
                  if (customPrintHandler) {
                    await customPrintHandler();
                  } else {
                    window.print();
                  }
                }}
                className="bg-red-700 hover:bg-red-800 text-white shadow-[1px_1px_0_0_rgba(0,0,0,0.5)] px-4 text-xs font-black h-8 flex items-center gap-1.5 active:shadow-[inset_1px_1px_0_0_rgba(0,0,0,0.5)] font-mono cursor-pointer"
              >
                <Printer className="w-4 h-4" /> SEND TO PRINTER
              </button>
            </div>
          </div>
        )}

        {/* Dynamic Email Configuration Panel */}
        {showEmailPanel && (
          <div className="bg-[#e9e4d9] border-b border-gray-400 p-4 font-sans no-print">
            <div className="max-w-2xl bg-white border border-gray-400 p-3 shadow-inner rounded">
              <h4 className="text-indigo-900 font-black text-xs uppercase tracking-wider mb-2 flex items-center gap-1">
                📬 Send Document as Email via Registered Account
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div>
                  <label htmlFor="sender_account_registered_252" className="block text-[10px] font-black text-gray-600 uppercase mb-1">
                    Sender Account (Registered):
                  </label>
                  <input  id="sender_account_registered_252" name="sender_account_registered" aria-label="Sender Account (Registered):"
                    type="text" 
                    readOnly 
                    value="rawjute@ballyjute.com" 
                    className="w-full bg-gray-100 border border-gray-300 text-gray-600 font-mono text-[11px] px-2 py-1 rounded  cursor-not-allowed"
                  />
                </div>
                <div>
                  <label htmlFor="recipient_address_es_comm_263" className="block text-[10px] font-black text-gray-600 uppercase mb-1">
                    Recipient Address(es) (Comma separated):
                  </label>
                  <input  id="recipient_address_es_comm_263" name="recipient_address_es_comm" aria-label="Recipient Address(es) (Comma separated):"
                    type="text" 
                    value={emailRecipient} 
                    onChange={(e) => setEmailRecipient(e.target.value)}
                    placeholder="rawjute@ballyjute.com, customer@example.com"
                    className="w-full bg-white border border-gray-300 text-gray-800 font-mono text-[11px] px-2 py-1 rounded shadow-sm focus:outline-indigo-500"
                  />
                </div>
              </div>

              <div className="mb-3">
                <label htmlFor="email_subject_line_277" className="block text-[10px] font-black text-gray-600 uppercase mb-1">
                  Email Subject Line:
                </label>
                <input  id="email_subject_line_277" name="email_subject_line" aria-label="Email Subject Line:"
                  type="text" 
                  value={emailSubject} 
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full bg-white border border-gray-300 text-gray-800 font-sans text-[11px] px-2 py-1 rounded shadow-sm focus:outline-indigo-500"
                />
              </div>

              {/* Status alerts */}
              {emailStatus === 'success' && (
                <div className="bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 p-2 text-xs font-bold rounded mb-3 flex items-center gap-1.5 animate-pulse">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Email sent successfully from rawjute@ballyjute.com!</span>
                </div>
              )}

              {emailStatus === 'error' && (
                <div className="bg-red-50 border-l-4 border-red-500 text-red-800 p-2 text-xs font-bold rounded mb-3">
                  <div className="flex items-center gap-1.5 mb-1 text-red-900">
                    <AlertTriangle className="w-4 h-4" />
                    <span>SMTP Transmission Failure</span>
                  </div>
                  <p className="font-mono text-[10px] text-red-700 leading-tight">
                    {emailErrorMsg}
                  </p>
                </div>
              )}

              <div className="flex justify-between items-center pt-1">
                <span className="text-[10px] text-gray-500 font-semibold font-sans">
                  * Converts on-screen slip table HTML exactly as rendered above
                </span>
                <button
                  type="button"
                  onClick={handleSendEmail}
                  disabled={emailStatus === 'sending'}
                  className={`px-4 py-1.5 rounded font-black text-xs flex items-center gap-1.5 text-white shadow transition cursor-pointer ${
                    emailStatus === 'sending' 
                      ? "bg-gray-500 cursor-not-allowed" 
                      : "bg-indigo-600 hover:bg-indigo-700 hover:shadow-md"
                  }`}
                >
                  {emailStatus === 'sending' ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>SENDING SECURELY...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>SEND EMAIL NOW (1-CLICK)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content Canvas */}
        <div id="print-modal-children-canvas" className="relative">
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              .no-print, .print-hidden, .print\\:hidden {
                display: none !important;
                visibility: hidden !important;
                height: 0 !important;
                width: 0 !important;
                margin: 0 !important;
                padding: 0 !important;
                border: none !important;
              }
            }
          `}} />
          {children}
        </div>

        {/* Bottom Status feedback */}
        {!hideActionBar && (
          <div className="bg-[#FBCFCB] py-1 px-3 text-[10px] text-gray-600 font-bold uppercase  border-t border-gray-400 flex justify-between no-print">
            <span>Standard Form No: JMCL/QR/2026</span>
            <span>Layout Optimized for Dot-Matrix & Standard Laser Printing</span>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
