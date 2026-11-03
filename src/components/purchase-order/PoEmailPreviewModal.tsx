import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Mail,
  X,
  Send,
  FileText,
  Paperclip,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  Plus
} from 'lucide-react';
import { cn } from '../../lib/utils';

export interface EmailPreviewState {
  poHeader: any;
  recipientTo: string;
  recipientCc: string;
  subject: string;
  emailHtml: string;
  pdfBase64?: string;
  filename?: string;
  brokerEmailSuggestion?: string;
  supplierEmailSuggestion?: string;
}

interface PoEmailPreviewModalProps {
  emailPreview: EmailPreviewState | null;
  onClose: () => void;
  onSend: (payload: {
    to: string;
    cc: string;
    subject: string;
    html: string;
    pdfData?: string;
    filename?: string;
    poNo: string;
  }) => Promise<boolean>;
}

export const PoEmailPreviewModal: React.FC<PoEmailPreviewModalProps> = ({
  emailPreview,
  onClose,
  onSend
}) => {
  if (!emailPreview) return null;

  const [to, setTo] = useState(emailPreview.recipientTo || '');
  const [cc, setCc] = useState(emailPreview.recipientCc || '');
  const [subject, setSubject] = useState(emailPreview.subject || '');
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [showCc, setShowCc] = useState(Boolean(emailPreview.recipientCc));
  const [viewTab, setViewTab] = useState<'preview' | 'html'>('preview');

  const handleAddEmailChip = (emailToAdd: string) => {
    if (!emailToAdd) return;
    const currentEmails = to.split(',').map(e => e.trim()).filter(Boolean);
    if (!currentEmails.includes(emailToAdd.trim())) {
      currentEmails.push(emailToAdd.trim());
      setTo(currentEmails.join(', '));
    }
  };

  const handleExecuteSend = async () => {
    const cleanTo = to.trim();
    if (!cleanTo) {
      setSendError('Please enter at least one recipient email address in the "To" field.');
      return;
    }

    // Simple email format check
    const emailList = cleanTo.split(',').map(e => e.trim()).filter(Boolean);
    const invalidEmails = emailList.filter(e => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
    if (invalidEmails.length > 0) {
      setSendError(`Invalid email address format: ${invalidEmails.join(', ')}`);
      return;
    }

    setSendError(null);
    setIsSending(true);

    try {
      const success = await onSend({
        to: cleanTo,
        cc: cc.trim(),
        subject: subject.trim() || `📋 Purchase Order #${emailPreview.poHeader.po_no || ''}`,
        html: emailPreview.emailHtml,
        pdfData: emailPreview.pdfBase64,
        filename: emailPreview.filename || `Purchase_Order_${emailPreview.poHeader.po_no || 'Document'}.pdf`,
        poNo: String(emailPreview.poHeader.po_no || '')
      });

      if (success) {
        onClose();
      }
    } catch (err: any) {
      setSendError(err.message || 'Failed to dispatch email. Please check network/SMTP configuration.');
    } finally {
      setIsSending(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-3 sm:p-5 animate-in fade-in duration-150">
      <div 
        className="w-full max-w-4xl max-h-[92vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-800 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center border border-white/20 shadow-inner">
              <Mail className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black uppercase tracking-wide">
                  Mail Preview & Dispatch
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-white/20 text-white border border-white/30">
                  Sauda Check Point #{emailPreview.poHeader.po_no}
                </span>
              </div>
              <p className="text-[11px] text-blue-100/90 font-medium">
                Review email content and recipients before sending
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isSending}
            className="text-white/80 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-50"
            title="Close Preview"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-50/50">
          {/* Error Message Box */}
          {sendError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-800 text-xs animate-in slide-in-from-top-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-semibold">{sendError}</div>
              <button 
                onClick={() => setSendError(null)} 
                className="text-rose-400 hover:text-rose-700 text-xs font-bold"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Recipient & Subject Configuration Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 space-y-3">
            {/* "To" Field */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <span className="text-rose-500">*</span> Send To (Recipients):
                </label>
                <div className="flex items-center gap-1.5">
                  {!showCc && (
                    <button
                      type="button"
                      onClick={() => setShowCc(true)}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                    >
                      + Add CC
                    </button>
                  )}
                </div>
              </div>

              <input
                type="text"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="e.g. broker@example.com, accounts@company.com"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-medium text-slate-800"
              />

              {/* Email Suggestions / Quick Chips */}
              {(emailPreview.brokerEmailSuggestion || emailPreview.supplierEmailSuggestion) && (
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                    Quick Add:
                  </span>
                  {emailPreview.brokerEmailSuggestion && (
                    <button
                      type="button"
                      onClick={() => handleAddEmailChip(emailPreview.brokerEmailSuggestion!)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors cursor-pointer"
                      title="Add Broker Email"
                    >
                      <Plus className="w-2.5 h-2.5" />
                      Broker: {emailPreview.brokerEmailSuggestion}
                    </button>
                  )}
                  {emailPreview.supplierEmailSuggestion && (
                    <button
                      type="button"
                      onClick={() => handleAddEmailChip(emailPreview.supplierEmailSuggestion!)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
                      title="Add Supplier Email"
                    >
                      <Plus className="w-2.5 h-2.5" />
                      Supplier: {emailPreview.supplierEmailSuggestion}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* "CC" Field (Optional) */}
            {showCc && (
              <div className="animate-in fade-in duration-150">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    CC (Carbon Copy):
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setCc('');
                      setShowCc(false);
                    }}
                    className="text-[10px] text-slate-400 hover:text-slate-600"
                  >
                    Remove CC
                  </button>
                </div>
                <input
                  type="text"
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  placeholder="e.g. audit@company.com, management@company.com"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-medium text-slate-800"
                />
              </div>
            )}

            {/* "Subject" Field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Subject Line:
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email Subject"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-semibold text-slate-800"
              />
            </div>

            {/* Attachments Banner */}
            <div className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 text-xs">
              <div className="flex items-center gap-2 text-slate-700">
                <Paperclip className="w-3.5 h-3.5 text-indigo-600" />
                <span className="font-bold">Attachment:</span>
                <span className="font-mono text-indigo-900 font-semibold">
                  {emailPreview.filename || `Purchase_Order_${emailPreview.poHeader.po_no}.pdf`}
                </span>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Auto-Attached (PDF Slip)
              </span>
            </div>
          </div>

          {/* Live Preview Container */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
            <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <Eye className="w-4 h-4 text-indigo-600" />
                <span>Live Email Body Preview</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setViewTab('preview')}
                  className={cn(
                    "px-2.5 py-1 text-[10px] font-extrabold rounded-md transition-colors",
                    viewTab === 'preview'
                      ? "bg-white text-indigo-700 shadow-xs border border-slate-200"
                      : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  Visual Preview
                </button>
              </div>
            </div>

            <div className="p-1 min-h-[280px] max-h-[380px] overflow-y-auto bg-slate-100">
              <iframe
                title="Email Content Preview"
                srcDoc={emailPreview.emailHtml}
                className="w-full min-h-[360px] bg-white rounded border border-slate-200"
                sandbox="allow-same-origin"
              />
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="px-5 py-3.5 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500 font-medium hidden sm:block">
            Review all details before dispatching to broker/supplier.
          </div>

          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isSending}
              className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleExecuteSend}
              disabled={isSending}
              className="px-5 py-2 text-xs font-black text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer disabled:opacity-60"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Dispatching Email...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Mail Now</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
