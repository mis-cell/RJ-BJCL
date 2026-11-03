import React, { useState, useEffect, useRef, useMemo } from "react";
import PrintModal from "../PrintModal";
import {
  SettlementMaster,
  SettlementDetailColumn,
  getColWtMt,
  getColAmount,
  getEffectiveColSettRate,
} from "../../types/settlement.types";
import { supabase } from "../../lib/supabase";
import { dbModule } from "../../services/dbModule";
import { getAuthenticatedUser } from "../../lib/userResolver";
import {
  DEFAULT_SETTLEMENT_TEMPLATE_CSV,
  parseCsvToGrid,
  formatDateDdMmYyyyHyphen,
  formatDateDdMmYySlash,
  formatIndAmount,
  countToEnglishWord,
  numberToIndianWords,
  resolveLoggedInPrintUserName,
} from "./settlementPrintHelpers";
import { buildSettlementPdfDocument } from "./settlementPdfGenerator";
import { SettlementPrintSheet } from "./SettlementPrintSheet";

export {
  countToEnglishWord,
  resolveLoggedInPrintUserName,
  DEFAULT_SETTLEMENT_TEMPLATE_CSV,
  parseCsvToGrid,
  formatDateDdMmYyyyHyphen,
  formatDateDdMmYySlash,
  formatIndAmount,
  numberToIndianWords,
};

export interface SettlementPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  viewModalData: {
    master: SettlementMaster;
    details: SettlementDetailColumn[];
  } | null;
  resolveGradeName?: (grade: string) => string;
}

export const SettlementPrintModal: React.FC<SettlementPrintModalProps> = ({
  isOpen,
  onClose,
  viewModalData,
  resolveGradeName = (g: string) => g,
}) => {
  const [persistedPrintCount, setPersistedPrintCount] = useState<number>(0);
  const [advancePayment, setAdvancePaymentDone] = useState<string>("Yes");
  const [rawTemplateCsv, setRawTemplateCsv] = useState<string>(DEFAULT_SETTLEMENT_TEMPLATE_CSV);
  const [viewMode, setViewMode] = useState<"pdf" | "sheet">("pdf");
  const isPrintingRef = useRef(false);
  const pdfIframeRef = useRef<HTMLIFrameElement | null>(null);

  // Load the saved CSV template file from /templates/settlement_template.csv or /assets/aistudio/templest_a48a2340.csv
  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    const loadTemplateFile = async () => {
      const paths = [
        "/templates/settlement_template.csv",
        "/assets/aistudio/templest_a48a2340.csv",
      ];
      for (const path of paths) {
        try {
          const res = await fetch(path, { cache: "no-store" });
          if (res.ok) {
            const text = await res.text();
            if (text && text.includes("BALLY JUTE COMPANY LIMITED") && active) {
              setRawTemplateCsv(text);
              return;
            }
          }
        } catch {
          // continue to fallback
        }
      }
    };
    loadTemplateFile();
    return () => {
      active = false;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !viewModalData?.master?.mr_no) return;
    let isMounted = true;
    const mrNo = viewModalData.master.mr_no;
    const initialCount = Number(viewModalData.master.print_count) || 0;
    setPersistedPrintCount(initialCount);

    const loadDbCount = async () => {
      if (!supabase) return;
      try {
        const { data: paymentRows } = await supabase
          .from("payment_master")
          .select("advance_payment_done, paid_amount, updated_at")
          .eq("mr_no", mrNo)
          .order("updated_at", { ascending: false });

        if (Array.isArray(paymentRows) && paymentRows.length > 0 && isMounted) {
          const hasAnyYes = paymentRows.some(
            (r: any) =>
              String(r.advance_payment_done || "Yes").trim().toLowerCase() !== "no" &&
              Number(r.paid_amount || 0) > 0
          );
          const topDecision = String(paymentRows[0].advance_payment_done || "Yes").trim();
          setAdvancePaymentDone(
            topDecision.toLowerCase() === "no" && !hasAnyYes ? "No" : "Yes"
          );
        }

        const { data } = await supabase
          .from("mr_settlement_master")
          .select("print_count")
          .eq("mr_no", mrNo)
          .maybeSingle();
        if (data && data.print_count !== null && data.print_count !== undefined) {
          if (isMounted) setPersistedPrintCount(Number(data.print_count));
          return;
        }

        const { data: histData } = await supabase
          .from("settlement_print_history")
          .select("print_count")
          .eq("mr_no", mrNo)
          .order("print_count", { ascending: false })
          .limit(1);
        if (histData && histData.length > 0 && histData[0].print_count !== undefined) {
          if (isMounted) setPersistedPrintCount(Number(histData[0].print_count));
        }
      } catch {
        // ignore
      }
    };

    loadDbCount();
    return () => {
      isMounted = false;
    };
  }, [isOpen, viewModalData?.master?.mr_no]);

  const master = viewModalData?.master || ({} as SettlementMaster);
  const details = viewModalData?.details || [];

  const activeDetails = useMemo(
    () =>
      details.filter(
        (c) =>
          (Number(c.quantity) > 0 || Number(c.arr_qty_wt) > 0 || Number(c.rate_value) > 0) &&
          getColWtMt(c) > 0
      ),
    [details]
  );

  const printNow = new Date();
  const todaySlash = `${String(printNow.getDate()).padStart(2, "0")}/${String(printNow.getMonth() + 1).padStart(2, "0")}/${String(printNow.getFullYear()).slice(-2)}`;
  const printedByDisplay = resolveLoggedInPrintUserName();

  const targetPrintNum = persistedPrintCount + 1;
  const printCountWord = countToEnglishWord(targetPrintNum);

  const mrDateDisplay = formatDateDdMmYyyyHyphen(master.mr_date || master.sett_date);
  const poDateDisplay = formatDateDdMmYyyyHyphen(master.po_date || master.mr_date);
  const partyBillDateDisplay = formatDateDdMmYySlash(
    master.payable_bill_date || master.mr_date || master.sett_date
  );

  const firstActiveCol = activeDetails[0] || details[0];
  const areaPart = (firstActiveCol?.area || "").trim();
  const agencyPart = (firstActiveCol?.agency || "").trim();
  const areaAgencyDisplay =
    areaPart && agencyPart
      ? `${areaPart} / ${agencyPart}`
      : areaPart || agencyPart || "-";

  const consignNoDisplay = (
    master.consign_no ||
    master.challan_rr_no ||
    master.challan_railway_receipt_no ||
    master.challan_no ||
    ""
  ).trim();

  const validInspectionDeductions = Array.isArray(master.deductions)
    ? master.deductions.filter(
        (d: any) =>
          d &&
          ((d.deduction_type && !String(d.deduction_type).includes("-- SELECT")) ||
            Number(d.deduction_rate) > 0 ||
            Number(d.deduction_amount) > 0)
      )
    : [];

  const inspectionDedItems = validInspectionDeductions.map((dItem: any) => {
    const rate = Number(dItem.deduction_rate) || 0;
    const qtyKgs = Number(dItem.deduction_qty) || (rate > 0 ? 1 : 0);
    let amount = Number(dItem.deduction_amount) || 0;
    if (amount <= 0 && qtyKgs > 0 && rate > 0) {
      amount = (qtyKgs * rate) / 100;
    } else if (amount === rate && qtyKgs > 1 && rate > 0) {
      amount = (qtyKgs * rate) / 100;
    }
    return {
      type: String(dItem.deduction_type || "").toUpperCase(),
      qtyKgs,
      rate,
      amount,
    };
  });

  const inspectionDedSum = inspectionDedItems.reduce((acc, item) => acc + item.amount, 0);

  const computedMaterialValue = activeDetails.reduce((acc, col) => acc + getColAmount(col), 0);
  const materialValue =
    computedMaterialValue > 0
      ? computedMaterialValue
      : Number(master.val_material_value || master.summary_material_value || 0);

  const actualApmc = Math.round(
    Number(master.actual_apmc_fees) > 0
      ? Number(master.actual_apmc_fees)
      : (materialValue - inspectionDedSum) * 0.01
  );
  const challanApmc = Math.round(Number(master.arival_apmc_fees) || 0);
  const settlementApmcDiff =
    Number(master.final_apmc_fees) > 0
      ? Math.round(Number(master.final_apmc_fees))
      : challanApmc > 0 && actualApmc > challanApmc
      ? actualApmc - challanApmc
      : 0;

  const miscAdd = Number(master.val_add_amt || master.summary_misc_add || 0);
  const miscLessTotal = inspectionDedSum + settlementApmcDiff;

  const totalMrAmount = materialValue + miscAdd - miscLessTotal;
  const rawMrAdvanceAmount = Number(master.final_on_ac_adv || master.less_advance_amount || 0);
  const effectiveAdvanceAmount = advancePayment === "No" ? 0 : rawMrAdvanceAmount;
  const effectiveBalanceDueRounded = Math.round(totalMrAmount - effectiveAdvanceAmount);
  const onAcAdvAdjusted = Number(master.final_less_adv || master.on_account_Effect || 0);
  const effectiveNetAmountToBePaid = Math.round(effectiveBalanceDueRounded - onAcAdvAdjusted);

  const onAcTotalAdv = Number(master.on_ac_total_advance || 0);
  const onAcTotalAdvAdj = Number(master.on_ac_total_adv_adjusted || 0);
  const onAcBalanceAmt = Math.max(0, onAcTotalAdv - onAcTotalAdvAdj);

  // Build the populated 55x23 logical CSV grid directly from the loaded CSV template
  const populatedGrid = useMemo(() => {
    const grid = parseCsvToGrid(rawTemplateCsv, 56, 23);
    const setCell = (r1Based: number, c0Based: number, val: string | number) => {
      if (r1Based >= 1 && r1Based <= grid.length && c0Based >= 0 && c0Based < grid[0].length) {
        grid[r1Based - 1][c0Based] = String(val ?? "");
      }
    };

    if (master.unit_name) {
      setCell(1, 0, master.unit_name);
    }

    setCell(
      2,
      4,
      `Printed On : ${todaySlash} by ${printedByDisplay}, No of Times Printed - ${printCountWord}`
    );

    setCell(3, 4, master.mr_no || "");
    setCell(3, 8, mrDateDisplay);

    setCell(4, 4, (master.supplier || "").toUpperCase());
    setCell(4, 10, master.payable_bill_no || "");

    setCell(5, 4, String((master as any).supplier_address || "").toUpperCase());

    setCell(6, 4, (master.broker || master.supplier || "").toUpperCase());

    setCell(7, 4, master.po_no || "");
    setCell(7, 8, poDateDisplay);

    setCell(8, 4, areaAgencyDisplay);
    setCell(8, 10, partyBillDateDisplay);

    setCell(9, 4, consignNoDisplay);
    setCell(10, 4, master.way_bill || "");
    setCell(11, 4, master.pan_no || "");

    // Clear default template placeholder rows 13..30 before populating grade items
    for (let r = 13; r <= 30; r++) {
      for (let c = 0; c < 23; c++) {
        setCell(r, c, "");
      }
    }

    // Populate Grade items
    activeDetails.forEach((col, idx) => {
      const baseRow = 14 + idx * 4;
      if (baseRow + 3 > 30) return;
      const rawGrade = resolveGradeName(col.grade || "").trim();
      const gradeDisplay =
        rawGrade && !rawGrade.endsWith(".") ? `${rawGrade}.` : rawGrade || "-";
      const markaDisplay = (col.marka_crop || "").split("/")[0].trim();
      const qtyBales = Number(col.quantity) || 0;
      const wtMt = getColWtMt(col);
      const wtKgs = Math.round(wtMt * 1000);
      const unitDisplay = (col.unit || "BALES").toUpperCase();
      const poRate = Number(col.rate_value) || 0;
      const premVal =
        Number(col.premium) > 0
          ? Number(col.premium)
          : Number(master.summary_premium_amount) > 0
          ? Number(master.summary_premium_amount)
          : Number(master.val_premium_amt) > 0 && wtMt > 0
          ? Number((Number(master.val_premium_amt) / (wtMt * 10)).toFixed(2))
          : 0;
      const gdClaim = Number(col.gd_claim) || 0;
      const gdSett =
        col.sett_pct !== undefined && col.sett_pct !== null
          ? Number(col.sett_pct)
          : Number(col.gd_sett) > 0
          ? Number(col.gd_sett)
          : gdClaim;
      const gdDedRate = Number(col.deduction_rate) || 0;
      const gdRateAdj = gdDedRate > 0 ? -gdDedRate : 0;
      const moistClaim =
        col.moist_claim !== undefined &&
        col.moist_claim !== null &&
        !isNaN(Number(col.moist_claim))
          ? Number(col.moist_claim)
          : Number(master.summary_rate_wt_claim) || 0;
      const netRateAdj = premVal - gdDedRate;
      const settRate = getEffectiveColSettRate(col);
      const colValue = getColAmount(col);

      setCell(baseRow, 1, gradeDisplay);
      setCell(baseRow, 2, markaDisplay);
      setCell(baseRow, 3, qtyBales);
      setCell(baseRow, 4, unitDisplay);
      setCell(baseRow, 5, poRate);
      setCell(baseRow, 6, "Grd.Down:");
      setCell(baseRow, 7, gdClaim > 0 ? gdClaim : "");
      setCell(baseRow, 8, gdSett > 0 ? gdSett : "");
      setCell(baseRow, 9, gdRateAdj);
      setCell(baseRow, 10, settRate);
      setCell(baseRow, 11, colValue.toFixed(2));

      setCell(baseRow + 1, 3, wtKgs);
      setCell(baseRow + 1, 4, "Kgs");
      setCell(baseRow + 1, 6, "Moisture:");
      setCell(baseRow + 1, 7, moistClaim > 0 ? moistClaim : "");

      setCell(baseRow + 2, 6, "Premium:");
      setCell(baseRow + 2, 9, premVal);

      setCell(baseRow + 3, 6, "Total:");
      setCell(baseRow + 3, 9, netRateAdj);
    });

    // Clear logical rows 32..39
    for (let r = 32; r <= 39; r++) {
      for (let c = 0; c < 23; c++) {
        setCell(r, c, "");
      }
    }

    let miscRowCursor = 32;
    inspectionDedItems.forEach((item) => {
      if (miscRowCursor <= 38) {
        setCell(miscRowCursor, 1, item.type);
        setCell(miscRowCursor, 5, `${item.qtyKgs} Kgs.`);
        setCell(miscRowCursor, 7, `@Rs.${item.rate}`);
        setCell(miscRowCursor, 9, "Less per Quintal");
        setCell(miscRowCursor, 11, `-${item.amount.toFixed(2)}`);
        miscRowCursor++;
      }
    });
    if (settlementApmcDiff > 0 && miscRowCursor <= 39) {
      setCell(
        miscRowCursor,
        1,
        `Miscellaneous Deduction M.R. value (Total-${actualApmc},Challan-${challanApmc},Settlement-${settlementApmcDiff})`
      );
      setCell(miscRowCursor, 11, `-${settlementApmcDiff.toFixed(2)}`);
      miscRowCursor++;
    }
    if (miscAdd > 0 && miscRowCursor <= 39) {
      setCell(miscRowCursor, 1, "Miscellaneous Addition (+)");
      setCell(miscRowCursor, 11, `+${miscAdd.toFixed(2)}`);
    }

    setCell(40, 1, `  Remarks :- ${master.remarks || ""}`);

    setCell(41, 11, formatIndAmount(materialValue));
    setCell(42, 5, `: Rs.   ${formatIndAmount(onAcTotalAdv)}`);
    setCell(42, 11, formatIndAmount(miscAdd));
    setCell(43, 5, `: Rs.   ${formatIndAmount(onAcTotalAdvAdj)}`);
    setCell(43, 11, formatIndAmount(miscLessTotal));
    setCell(44, 5, `: Rs.   ${formatIndAmount(onAcBalanceAmt)}`);
    setCell(44, 11, formatIndAmount(totalMrAmount));
    setCell(45, 11, formatIndAmount(effectiveAdvanceAmount));
    setCell(46, 11, formatIndAmount(effectiveBalanceDueRounded));
    setCell(47, 11, formatIndAmount(onAcAdvAdjusted));
    setCell(48, 11, formatIndAmount(effectiveNetAmountToBePaid));
    setCell(
      49,
      7,
      `Rs. :  ${numberToIndianWords(effectiveNetAmountToBePaid)} ONLY`
    );

    if (Array.isArray(master.cheque_adjustments)) {
      master.cheque_adjustments.slice(0, 3).forEach((chk, cIdx) => {
        setCell(47 + cIdx, 1, chk.cheque_no || "");
        setCell(47 + cIdx, 3, chk.date || "");
        setCell(47 + cIdx, 5, formatIndAmount(chk.adjusted_value));
      });
    }

    return grid;
  }, [
    rawTemplateCsv,
    master,
    activeDetails,
    todaySlash,
    printedByDisplay,
    printCountWord,
    mrDateDisplay,
    poDateDisplay,
    partyBillDateDisplay,
    areaAgencyDisplay,
    consignNoDisplay,
    inspectionDedItems,
    settlementApmcDiff,
    actualApmc,
    challanApmc,
    miscAdd,
    materialValue,
    onAcTotalAdv,
    onAcTotalAdvAdj,
    miscLessTotal,
    onAcBalanceAmt,
    totalMrAmount,
    effectiveAdvanceAmount,
    effectiveBalanceDueRounded,
    onAcAdvAdjusted,
    effectiveNetAmountToBePaid,
    resolveGradeName,
  ]);

  const { pdfBlobUrl, pdfBase64 } = useMemo(() => {
    if (!isOpen || !viewModalData) {
      return { pdfBlobUrl: "", pdfBase64: "" };
    }
    try {
      const doc = buildSettlementPdfDocument(
        populatedGrid,
        activeDetails.length,
        effectiveNetAmountToBePaid,
        onAcTotalAdv,
        onAcTotalAdvAdj,
        onAcBalanceAmt,
        false
      );
      const blob = doc.output("blob");
      const url = URL.createObjectURL(blob);
      const dataUri = doc.output("datauristring");
      const base64 = dataUri.split(",")[1] || "";
      return { pdfBlobUrl: url, pdfBase64: base64 };
    } catch (err) {
      console.error("Failed to generate Settlement PDF from CSV template:", err);
      return { pdfBlobUrl: "", pdfBase64: "" };
    }
  }, [
    isOpen,
    viewModalData,
    populatedGrid,
    activeDetails.length,
    effectiveNetAmountToBePaid,
    onAcTotalAdv,
    onAcTotalAdvAdj,
    onAcBalanceAmt,
  ]);

  useEffect(() => {
    return () => {
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
      }
    };
  }, [pdfBlobUrl]);

  if (!isOpen || !viewModalData) return null;

  const handleInitiatePrint = async () => {
    if (isPrintingRef.current) return;
    isPrintingRef.current = true;

    const mrNo = master.mr_no;
    const nextCount = persistedPrintCount + 1;
    const nowIso = new Date().toISOString();
    const userName = printedByDisplay;
    let userId: string | null = null;
    try {
      const auth = getAuthenticatedUser();
      userId = auth.userId || null;
    } catch {}

    try {
      if (supabase && mrNo) {
        await supabase
          .from("mr_settlement_master")
          .update({
            print_count: nextCount,
            last_printed_at: nowIso,
            last_printed_by_name: userName,
          })
          .eq("mr_no", mrNo);

        await supabase
          .from("settlement_print_history")
          .insert({
            mr_no: mrNo,
            print_count: nextCount,
            printed_by_name: userName,
            printed_by_id: userId,
            printed_at: nowIso,
          });
      }

      try {
        await dbModule.update("mr_settlement_master", "mr_no", mrNo, {
          print_count: nextCount,
          last_printed_at: nowIso,
          last_printed_by_name: userName,
        });
      } catch {}

      master.print_count = nextCount;
      master.last_printed_at = nowIso;
      master.last_printed_by_name = userName;

      setPersistedPrintCount(nextCount);
    } catch (err) {
      console.error("Failed to record settlement print tracking:", err);
    } finally {
      setTimeout(() => {
        isPrintingRef.current = false;
      }, 1500);
    }
  };

  const handleSendPdfToPrinter = async () => {
    try {
      if (pdfIframeRef.current?.contentWindow) {
        pdfIframeRef.current.contentWindow.focus();
        pdfIframeRef.current.contentWindow.print();
        return;
      }
    } catch {}

    try {
      const doc = buildSettlementPdfDocument(
        populatedGrid,
        activeDetails.length,
        effectiveNetAmountToBePaid,
        onAcTotalAdv,
        onAcTotalAdvAdj,
        onAcBalanceAmt,
        true
      );
      const blob = doc.output("blob");
      const url = URL.createObjectURL(blob);
      const printFrame = document.createElement("iframe");
      printFrame.style.position = "fixed";
      printFrame.style.right = "0";
      printFrame.style.bottom = "0";
      printFrame.style.width = "1px";
      printFrame.style.height = "1px";
      printFrame.style.border = "0";
      printFrame.src = url;
      document.body.appendChild(printFrame);
      printFrame.onload = () => {
        try {
          printFrame.contentWindow?.focus();
          printFrame.contentWindow?.print();
        } catch {
          window.print();
        }
        setTimeout(() => {
          document.body.removeChild(printFrame);
          URL.revokeObjectURL(url);
        }, 60000);
      };
    } catch {
      window.print();
    }
  };

  const handleExportFilledCsvTemplate = () => {
    const escapeCsvField = (field: string) => {
      if (field.includes(",") || field.includes('"') || field.includes("\n")) {
        return `"${field.replace(/"/g, '""')}"`;
      }
      return field;
    };

    const csvContent =
      "\uFEFF" +
      populatedGrid.map((row) => row.map(escapeCsvField).join(",")).join("\r\n") +
      "\r\n";

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `Settlement_Template_${(master.mr_no || "MR").replace(/[^a-zA-Z0-9_-]/g, "_")}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <PrintModal
      isOpen={isOpen}
      onClose={onClose}
      title={`MR SETTLEMENT STATEMENT PREVIEW - ${master.mr_no || "N/A"}`}
      onPrint={handleInitiatePrint}
      customPrintHandler={viewMode === "pdf" ? handleSendPdfToPrinter : undefined}
      customPdfBase64={pdfBase64}
      showTip={false}
      hideActionBar={false}
      extraActions={
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setViewMode(viewMode === "sheet" ? "pdf" : "sheet")}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border border-slate-500"
          >
            {viewMode === "sheet" ? "Switch to PDF Viewer" : "Switch to Sheet View"}
          </button>
          <button
            type="button"
            onClick={handleExportFilledCsvTemplate}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-700 hover:bg-teal-600 text-white rounded text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border border-teal-500"
          >
            Export CSV
          </button>
        </div>
      }
    >
      {viewMode === "pdf" && pdfBlobUrl && (
        <div className="pdf-embed-container no-print w-full bg-[#323639] flex flex-col items-center">
          <iframe
            ref={pdfIframeRef}
            src={`${pdfBlobUrl}#toolbar=1&navpanes=0&view=FitH`}
            title={`Settlement PDF - ${master.mr_no || ""}`}
            onLoad={() => {
              try {
                const win = pdfIframeRef.current?.contentWindow;
                if (win) {
                  win.addEventListener("beforeprint", () => {
                    handleInitiatePrint();
                  });
                }
              } catch {
                // ignore
              }
            }}
            className="w-full h-[82vh] bg-white border-0"
          />
        </div>
      )}

      <SettlementPrintSheet
        viewMode={viewMode}
        pdfBlobUrl={pdfBlobUrl}
        master={master}
        activeDetails={activeDetails}
        resolveGradeName={resolveGradeName}
        todaySlash={todaySlash}
        printedByDisplay={printedByDisplay}
        printCountWord={printCountWord}
        mrDateDisplay={mrDateDisplay}
        poDateDisplay={poDateDisplay}
        partyBillDateDisplay={partyBillDateDisplay}
        areaAgencyDisplay={areaAgencyDisplay}
        consignNoDisplay={consignNoDisplay}
        inspectionDedItems={inspectionDedItems}
        settlementApmcDiff={settlementApmcDiff}
        actualApmc={actualApmc}
        challanApmc={challanApmc}
        miscAdd={miscAdd}
        miscLessTotal={miscLessTotal}
        materialValue={materialValue}
        totalMrAmount={totalMrAmount}
        effectiveAdvanceAmount={effectiveAdvanceAmount}
        effectiveBalanceDueRounded={effectiveBalanceDueRounded}
        onAcAdvAdjusted={onAcAdvAdjusted}
        effectiveNetAmountToBePaid={effectiveNetAmountToBePaid}
        onAcTotalAdv={onAcTotalAdv}
        onAcTotalAdvAdj={onAcTotalAdvAdj}
        onAcBalanceAmt={onAcBalanceAmt}
      />
    </PrintModal>
  );
};

export default SettlementPrintModal;
