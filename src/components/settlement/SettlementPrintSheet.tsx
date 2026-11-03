import React from "react";
import {
  SettlementMaster,
  SettlementDetailColumn,
  getColWtMt,
  getColAmount,
  getEffectiveColSettRate,
} from "../../types/settlement.types";
import { formatIndAmount, numberToIndianWords } from "./settlementPrintHelpers";

export interface SettlementPrintSheetProps {
  viewMode: "pdf" | "sheet";
  pdfBlobUrl: string;
  master: SettlementMaster;
  activeDetails: SettlementDetailColumn[];
  resolveGradeName: (g: string) => string;
  todaySlash: string;
  printedByDisplay: string;
  printCountWord: string;
  mrDateDisplay: string;
  poDateDisplay: string;
  partyBillDateDisplay: string;
  areaAgencyDisplay: string;
  consignNoDisplay: string;
  inspectionDedItems: Array<{
    type: string;
    qtyKgs: number;
    rate: number;
    amount: number;
  }>;
  settlementApmcDiff: number;
  actualApmc: number;
  challanApmc: number;
  miscAdd: number;
  miscLessTotal: number;
  materialValue: number;
  totalMrAmount: number;
  effectiveAdvanceAmount: number;
  effectiveBalanceDueRounded: number;
  onAcAdvAdjusted: number;
  effectiveNetAmountToBePaid: number;
  onAcTotalAdv: number;
  onAcTotalAdvAdj: number;
  onAcBalanceAmt: number;
}

export const SettlementPrintSheet: React.FC<SettlementPrintSheetProps> = ({
  viewMode,
  pdfBlobUrl,
  master,
  activeDetails,
  resolveGradeName,
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
  miscLessTotal,
  materialValue,
  totalMrAmount,
  effectiveAdvanceAmount,
  effectiveBalanceDueRounded,
  onAcAdvAdjusted,
  effectiveNetAmountToBePaid,
  onAcTotalAdv,
  onAcTotalAdvAdj,
  onAcBalanceAmt,
}) => {
  return (
    <div
      id="print-modal-children-canvas"
      className={`${
        viewMode === "pdf" && pdfBlobUrl ? "hidden print:flex" : "flex"
      } bg-white text-black px-3 py-2 mx-auto w-full max-w-[193mm] min-h-[275mm] flex-col justify-between text-[12px] leading-tight select-text`}
      style={{
        fontFamily: "'Times New Roman', Times, serif",
        boxSizing: "border-box",
      }}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 8mm 8mm 8mm;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #print-modal-children-canvas {
            display: flex !important;
            width: 100% !important;
            max-width: 100% !important;
            min-height: 275mm !important;
            padding: 0 !important;
            margin: 0 !important;
            box-sizing: border-box !important;
          }
        }
      `,
        }}
      />

      {/* Top Section (Rows 1 to 39 of CSV Template) */}
      <div className="w-full">
        {/* Row 1: Company Title Centered at Very Top */}
        <div className="text-center font-bold text-[17px] tracking-wide uppercase leading-tight pb-1">
          {master.unit_name || "BALLY JUTE COMPANY LIMITED"}
        </div>

        {/* Row 2: Powered by KatEye™ (Left) & Printed On (Right) */}
        <div className="flex justify-between items-baseline pb-1 text-[11.5px] w-full px-0.5">
          <div className="text-left whitespace-nowrap italic font-bold">
            Powered by KatEye™
          </div>
          <div
            className="text-right whitespace-nowrap font-bold text-[10.5px]"
            style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
          >
            Printed On : {todaySlash} by {printedByDisplay}, No of Times Printed -{" "}
            {printCountWord}
          </div>
        </div>

        {/* Main Outer Frame Box (Rows 3 to 49 of Template) */}
        <div className="border border-black flex flex-col justify-between min-h-[242mm]">
          <div>
            {/* Framed Master Header Box (Rows 3 to 11 of Template) */}
            <div className="grid grid-cols-12 text-[12px] border-b border-black">
              {/* Left Details (9 cols) */}
              <div className="col-span-9 px-2 py-1 space-y-0.5 leading-[1.35]">
                <div className="grid grid-cols-12 items-baseline">
                  <div className="col-span-2 font-bold">MR No.</div>
                  <div className="col-span-5 font-bold">
                    : &nbsp;{master.mr_no || ""}
                  </div>
                  <div className="col-span-5 grid grid-cols-12">
                    <span className="col-span-5 font-bold">Date</span>
                    <span className="col-span-7 font-bold">: &nbsp;{mrDateDisplay}</span>
                  </div>
                </div>

                <div className="grid grid-cols-12 items-baseline">
                  <div className="col-span-2 font-bold">Supplier</div>
                  <div className="col-span-10 uppercase font-bold">
                    : &nbsp;{(master.supplier || "").toUpperCase()}
                  </div>
                </div>

                <div className="grid grid-cols-12 items-baseline min-h-[14px]">
                  <div className="col-span-2"></div>
                  <div className="col-span-10 uppercase pl-3">
                    {(master as any).supplier_address || ""}
                  </div>
                </div>

                <div className="grid grid-cols-12 items-baseline">
                  <div className="col-span-2 font-bold">Broker</div>
                  <div className="col-span-10 uppercase font-bold">
                    : &nbsp;{(master.broker || master.supplier || "").toUpperCase()}
                  </div>
                </div>

                <div className="grid grid-cols-12 items-baseline">
                  <div className="col-span-2 font-bold">Order No</div>
                  <div className="col-span-5 font-bold">
                    : &nbsp;{master.po_no || ""}
                  </div>
                  <div className="col-span-5 grid grid-cols-12">
                    <span className="col-span-5 font-bold">Date</span>
                    <span className="col-span-7 font-bold">: &nbsp;{poDateDisplay}</span>
                  </div>
                </div>

                <div className="grid grid-cols-12 items-baseline">
                  <div className="col-span-2 font-bold">Area/Agency</div>
                  <div className="col-span-10 uppercase font-bold">
                    : &nbsp;{areaAgencyDisplay}
                  </div>
                </div>

                <div className="grid grid-cols-12 items-baseline">
                  <div className="col-span-2 font-bold">Consign No.</div>
                  <div className="col-span-10 font-bold">
                    : &nbsp;{consignNoDisplay || ""}
                  </div>
                </div>

                <div className="grid grid-cols-12 items-baseline">
                  <div className="col-span-2 font-bold">Way Bill</div>
                  <div className="col-span-10 font-bold">
                    : &nbsp;{master.way_bill || ""}
                  </div>
                </div>

                <div className="grid grid-cols-12 items-baseline">
                  <div className="col-span-2 font-bold">Pan No.</div>
                  <div className="col-span-10 font-bold">
                    : &nbsp;{master.pan_no || ""}
                  </div>
                </div>
              </div>

              {/* Right Split Box: Party Bill No & Party Bill Date (3 cols) */}
              <div className="col-span-3 border-l border-black flex flex-col justify-between text-[12px]">
                <div className="flex-1 border-b border-black flex flex-col">
                  <div className="border-b border-black py-0.5 px-1 text-center font-bold">
                    Party Bill No
                  </div>
                  <div className="flex-1 flex items-center justify-center px-1 text-center font-bold">
                    {master.payable_bill_no || ""}
                  </div>
                </div>
                <div className="flex-1 flex flex-col">
                  <div className="border-b border-black py-0.5 px-1 text-center font-bold">
                    Party Bill Date
                  </div>
                  <div className="flex-1 flex items-center justify-center px-1 text-center font-bold">
                    {partyBillDateDisplay}
                  </div>
                </div>
              </div>
            </div>

            {/* Row 12: Material Details Table (.clean-print-table bypasses global index.css table rules) */}
            <div className="min-h-[82mm] flex flex-col justify-between border-b border-black">
              <table className="clean-print-table w-full text-[12px] table-fixed border-collapse bg-white">
                <colgroup>
                  <col style={{ width: "8%" }} />
                  <col style={{ width: "9%" }} />
                  <col style={{ width: "9%" }} />
                  <col style={{ width: "7%" }} />
                  <col style={{ width: "8%" }} />
                  <col style={{ width: "11%" }} />
                  <col style={{ width: "8%" }} />
                  <col style={{ width: "7%" }} />
                  <col style={{ width: "8%" }} />
                  <col style={{ width: "9%" }} />
                  <col style={{ width: "16%" }} />
                </colgroup>
                <thead>
                  <tr className="border-b border-black bg-white text-black font-bold text-[12px] leading-tight">
                    <th className="py-1 px-1 text-left align-bottom bg-white border-0">
                      Grade
                    </th>
                    <th className="py-1 px-1 text-left align-bottom bg-white border-0">
                      Marka
                    </th>
                    <th className="py-1 px-1 text-right align-bottom bg-white border-0">
                      Quantity
                    </th>
                    <th className="py-1 px-1 text-left align-bottom bg-white border-0">
                      Unit
                    </th>
                    <th className="py-1 px-1 text-left align-bottom leading-tight bg-white border-0">
                      <div>P.O</div>
                      <div>Rate</div>
                    </th>
                    <th className="py-1 px-1 text-left align-bottom bg-white border-0">
                      Type
                    </th>
                    <th className="py-1 px-1 text-left align-bottom bg-white border-0">
                      Claim
                    </th>
                    <th className="py-1 px-1 text-left align-bottom bg-white border-0">
                      Sett.
                    </th>
                    <th className="py-1 px-1 text-left align-bottom leading-tight bg-white border-0">
                      <div>Rate</div>
                      <div>(+/-)</div>
                    </th>
                    <th className="py-1 px-1 text-left align-bottom leading-tight bg-white border-0">
                      <div>Sett.</div>
                      <div>Rate</div>
                    </th>
                    <th className="py-1 px-1 text-center align-bottom bg-white border-0">
                      Value
                    </th>
                  </tr>
                </thead>
                <tbody className="text-[12px] leading-[1.35] bg-white">
                  {activeDetails.map((col, idx) => {
                    const rawGrade = resolveGradeName(col.grade || "").trim();
                    const gradeDisplay =
                      rawGrade && !rawGrade.endsWith(".")
                        ? `${rawGrade}.`
                        : rawGrade || "-";

                    const markaDisplay = (col.marka_crop || "")
                      .split("/")[0]
                      .trim();
                    const qtyBales = Number(col.quantity) || 0;
                    const wtMt = getColWtMt(col);
                    const wtKgs = Math.round(wtMt * 1000);
                    const unitDisplay = col.unit || "BALES";

                    const poRate = Number(col.rate_value) || 0;
                    const premVal =
                      Number(col.premium) > 0
                        ? Number(col.premium)
                        : Number(master.summary_premium_amount) > 0
                        ? Number(master.summary_premium_amount)
                        : Number(master.val_premium_amt) > 0 && wtMt > 0
                        ? Number(
                            (Number(master.val_premium_amt) / (wtMt * 10)).toFixed(
                              2
                            )
                          )
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

                    const cellCls = "py-0 px-1 border-0 align-top bg-white";

                    return (
                      <React.Fragment key={idx}>
                        <tr className="border-0 bg-white">
                          <td className={`${cellCls} pt-1 font-bold text-left`}>
                            {gradeDisplay}
                          </td>
                          <td className={`${cellCls} pt-1 uppercase text-left`}>
                            {markaDisplay}
                          </td>
                          <td className={`${cellCls} pt-1 text-right`}>
                            {qtyBales}
                          </td>
                          <td className={`${cellCls} pt-1 text-left uppercase`}>
                            {unitDisplay}
                          </td>
                          <td className={`${cellCls} pt-1 text-right pr-3`}>{poRate}</td>
                          <td className={`${cellCls} pt-1 text-left`}>
                            Grd.Down:
                          </td>
                          <td className={`${cellCls} pt-1 text-right pr-2`}>
                            {gdClaim > 0 ? gdClaim : ""}
                          </td>
                          <td className={`${cellCls} pt-1 text-right pr-2`}>
                            {gdSett > 0 ? gdSett : ""}
                          </td>
                          <td className={`${cellCls} pt-1 text-right pr-3`}>
                            {gdRateAdj}
                          </td>
                          <td className={`${cellCls} pt-1 text-right pr-3`}>
                            {settRate}
                          </td>
                          <td className={`${cellCls} pt-1 text-right`}>
                            {colValue.toFixed(2)}
                          </td>
                        </tr>

                        <tr className="border-0 bg-white">
                          <td className={cellCls}></td>
                          <td className={cellCls}></td>
                          <td className={`${cellCls} text-right`}>{wtKgs}</td>
                          <td className={`${cellCls} text-left`}>Kgs</td>
                          <td className={cellCls}></td>
                          <td className={`${cellCls} text-left`}>
                            Moisture:
                          </td>
                          <td className={`${cellCls} text-right pr-2`}>
                            {moistClaim > 0 ? moistClaim : ""}
                          </td>
                          <td className={cellCls}></td>
                          <td className={cellCls}></td>
                          <td className={cellCls}></td>
                          <td className={cellCls}></td>
                        </tr>

                        <tr className="border-0 bg-white">
                          <td className={cellCls}></td>
                          <td className={cellCls}></td>
                          <td className={cellCls}></td>
                          <td className={cellCls}></td>
                          <td className={cellCls}></td>
                          <td className={`${cellCls} text-left`}>
                            Premium:
                          </td>
                          <td className={cellCls}></td>
                          <td className={cellCls}></td>
                          <td className={`${cellCls} text-right pr-3`}>
                            <div className="border-b border-black inline-block min-w-[38px] text-right">
                              {premVal}
                            </div>
                          </td>
                          <td className={cellCls}></td>
                          <td className={cellCls}></td>
                        </tr>

                        <tr className="border-0 bg-white">
                          <td className={`${cellCls} pb-1.5`}></td>
                          <td className={`${cellCls} pb-1.5`}></td>
                          <td className={`${cellCls} pb-1.5`}></td>
                          <td className={`${cellCls} pb-1.5`}></td>
                          <td className={`${cellCls} pb-1.5`}></td>
                          <td className={`${cellCls} pb-1.5 text-left`}>
                            Total:
                          </td>
                          <td className={`${cellCls} pb-1.5`}></td>
                          <td className={`${cellCls} pb-1.5`}></td>
                          <td className={`${cellCls} pb-1.5 text-right pr-3`}>
                            {netRateAdj}
                          </td>
                          <td className={`${cellCls} pb-1.5`}></td>
                          <td className={`${cellCls} pb-1.5`}></td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Row 31: Miscellaneous Charges Section */}
            <div className="px-2 py-1.5 text-[12px] min-h-[42mm]">
              <div className="text-center font-bold text-[12px] mb-1.5">
                Miscellaneous Charges
              </div>

              <div className="space-y-0.5 text-[11.5px]">
                {inspectionDedItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-baseline"
                  >
                    <div className="w-[40%] uppercase">{item.type}</div>
                    <div className="w-[15%] text-right">
                      {item.qtyKgs} Kgs.
                    </div>
                    <div className="w-[15%] text-right">@Rs.{item.rate}</div>
                    <div className="w-[18%] text-center">Less per Quintal</div>
                    <div className="w-[12%] text-right">
                      -{item.amount.toFixed(2)}
                    </div>
                  </div>
                ))}

                {settlementApmcDiff > 0 && (
                  <div className="flex justify-between items-baseline">
                    <div className="w-[85%]">
                      Miscellaneous Deduction M.R. value (Total-{actualApmc}
                      ,Challan-{challanApmc},Settlement-{settlementApmcDiff})
                    </div>
                    <div className="w-[15%] text-right">
                      -{settlementApmcDiff.toFixed(2)}
                    </div>
                  </div>
                )}

                {miscAdd > 0 && (
                  <div className="flex justify-between items-baseline">
                    <div className="w-[85%]">Miscellaneous Addition (+)</div>
                    <div className="w-[15%] text-right">
                      +{miscAdd.toFixed(2)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Section inside Main Frame (Logical Rows 40 to 49 of Template) */}
          <div>
            {/* Logical Row 40: Remarks Box */}
            <div className="border-t border-b border-black px-2 py-1 text-[12px] font-bold">
              Remarks :-{" "}
              <span className="font-normal">{master.remarks || ""}</span>
            </div>

            {/* Logical Rows 41 to 49: Split Bottom Summary Box */}
            <div className="grid grid-cols-12 text-[12px]">
              {/* Left Half (Cols 1..7) */}
              <div className="col-span-6 border-r border-black flex flex-col justify-between">
                <div>
                  <div className="px-2 pt-0.5 pb-0.5 border-b border-black leading-[1.35]">
                    <div className="font-bold underline">Note:</div>
                    <div className="grid grid-cols-12 items-baseline">
                      <div className="col-span-7 font-bold">
                        On A/c Total Advance
                      </div>
                      <div className="col-span-2 font-bold">: Rs.</div>
                      <div className="col-span-3 text-right font-bold pr-4">
                        {formatIndAmount(onAcTotalAdv)}
                      </div>
                    </div>
                    <div className="grid grid-cols-12 items-baseline">
                      <div className="col-span-7 font-bold">
                        On A/c Total Adv. Adjusted
                      </div>
                      <div className="col-span-2 font-bold">: Rs.</div>
                      <div className="col-span-3 text-right font-bold pr-4">
                        {formatIndAmount(onAcTotalAdvAdj)}
                      </div>
                    </div>
                  </div>

                  <div className="px-2 py-0.5 border-b border-black grid grid-cols-12 items-baseline">
                    <div className="col-span-7 font-bold">
                      Balance Amount
                    </div>
                    <div className="col-span-2 font-bold">: Rs.</div>
                    <div className="col-span-3 text-right font-bold pr-4">
                      {formatIndAmount(onAcBalanceAmt)}
                    </div>
                  </div>

                  <div className="py-0.5 px-1 border-b border-black text-center font-bold">
                    On A/c Adv. Adjustment Made Against This MR
                  </div>

                  <div className="grid grid-cols-12 border-b border-black font-bold text-center py-0.5">
                    <div className="col-span-4">Cheque No</div>
                    <div className="col-span-4">Date</div>
                    <div className="col-span-4">Adjusted Value</div>
                  </div>
                </div>

                <div className="grid grid-cols-12 flex-1 min-h-[48px] text-[11.5px] py-0.5">
                  <div className="col-span-4 px-2 text-center">
                    {Array.isArray(master.cheque_adjustments) &&
                      master.cheque_adjustments.map((c, i) => (
                        <div key={i}>{c.cheque_no}</div>
                      ))}
                  </div>
                  <div className="col-span-4 px-2 text-center">
                    {Array.isArray(master.cheque_adjustments) &&
                      master.cheque_adjustments.map((c, i) => (
                        <div key={i}>{c.date}</div>
                      ))}
                  </div>
                  <div className="col-span-4 px-4 text-right">
                    {Array.isArray(master.cheque_adjustments) &&
                      master.cheque_adjustments.map((c, i) => (
                        <div key={i}>
                          {formatIndAmount(c.adjusted_value)}
                        </div>
                      ))}
                  </div>
                </div>
              </div>

              {/* Right Half (Cols 8..12) */}
              <div className="col-span-6 flex flex-col justify-between text-[12px] leading-[1.35]">
                <div>
                  <div className="px-2 pt-0.5 pb-0.5 border-b border-black">
                    <div className="grid grid-cols-12 items-baseline">
                      <div className="col-span-6 font-bold">
                        Material Value
                      </div>
                      <div className="col-span-1 font-bold">:</div>
                      <div className="col-span-5 text-right font-bold">
                        {formatIndAmount(materialValue)}
                      </div>
                    </div>
                    <div className="grid grid-cols-12 items-baseline">
                      <div className="col-span-6 font-bold">
                        Material Misc(+)
                      </div>
                      <div className="col-span-1 font-bold">:</div>
                      <div className="col-span-5 text-right font-bold">
                        {formatIndAmount(miscAdd)}
                      </div>
                    </div>
                    <div className="grid grid-cols-12 items-baseline">
                      <div className="col-span-6 font-bold">
                        Material Misc(-)
                      </div>
                      <div className="col-span-1 font-bold">:</div>
                      <div className="col-span-5 text-right font-bold">
                        {formatIndAmount(miscLessTotal)}
                      </div>
                    </div>
                  </div>

                  <div className="px-2 py-0.5 border-b border-black">
                    <div className="grid grid-cols-12 items-baseline">
                      <div className="col-span-6 font-bold">
                        Total MR Amount
                      </div>
                      <div className="col-span-1 font-bold">:</div>
                      <div className="col-span-5 text-right font-bold">
                        {formatIndAmount(totalMrAmount)}
                      </div>
                    </div>
                    <div className="grid grid-cols-12 items-baseline">
                      <div className="col-span-6 pl-2 font-bold">
                        MR Advance Amount
                      </div>
                      <div className="col-span-1 font-bold">:</div>
                      <div className="col-span-5 text-right font-bold">
                        {formatIndAmount(effectiveAdvanceAmount)}
                      </div>
                    </div>
                  </div>

                  <div className="px-2 py-0.5 border-b border-black">
                    <div className="grid grid-cols-12 items-baseline">
                      <div className="col-span-6 pl-1 font-bold">
                        Balance Due(Rounded)
                      </div>
                      <div className="col-span-1 font-bold">:</div>
                      <div className="col-span-5 text-right font-bold">
                        {formatIndAmount(effectiveBalanceDueRounded)}
                      </div>
                    </div>
                  </div>

                  <div className="px-2 py-0.5 border-b border-black">
                    <div className="grid grid-cols-12 items-baseline">
                      <div className="col-span-8 font-bold">
                        On A/c Adv. Adjusted Amount :
                      </div>
                      <div className="col-span-4 text-right font-bold">
                        {formatIndAmount(onAcAdvAdjusted)}
                      </div>
                    </div>
                  </div>

                  <div className="px-2 py-0.5">
                    <div className="grid grid-cols-12 items-baseline">
                      <div className="col-span-6 pl-2 font-bold">
                        Net Amount to be Paid
                      </div>
                      <div className="col-span-1 font-bold">:</div>
                      <div className="col-span-5 text-right font-bold">
                        {formatIndAmount(effectiveNetAmountToBePaid)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="px-1.5 pt-0.5 pb-1 font-bold text-[9.5px] leading-snug uppercase">
                  <span className="text-[11px]">Rs. : </span>
                  {numberToIndianWords(effectiveNetAmountToBePaid)} ONLY
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Logical Row 54: Bottom Signatures */}
      <div
        className="pt-7 pb-1 px-4 flex justify-between items-end text-[11px] font-bold"
        style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
      >
        <div className="underline">Prepared by</div>
        <div className="underline">Checked by</div>
        <div className="underline">Authorised Signatory</div>
      </div>
    </div>
  );
};
