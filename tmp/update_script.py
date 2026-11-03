with open('src/pages/PurchaseOrder.tsx', 'r') as f:
    lines = f.readlines()

start_idx = None
end_idx = None

for i, line in enumerate(lines):
    if 'const clean = (v: any) => String(v ??' in line and i > 4650 and i < 4750:
        start_idx = i
    if '// 3. When Inspection is Pass (or Cleared):' in line and i > 4700 and i < 4800:
        end_idx = i
        break

if start_idx is not None and end_idx is not None:
    print(f'Replacing lines {start_idx} to {end_idx}')
    new_chunk = [
        "                                 const stage = item.workflow_stage || (item.pass_status === 'pass' ? 'eligible_adv_payment' : item.pass_status) || 'temp_arrival_pending';\n",
        "                                 const isResolved = isPoMismatchResolved(item);\n",
        "                                 const isPaymentDone = checkIsAdvancePaymentDone(item, allPayments) || item.has_payment_done;\n",
        "\n",
        "                                 // Stage 1: Temporary Arrival Pending (Material has not arrived at mill gate yet)\n",
        "                                 if (stage === 'temp_arrival_pending') {\n",
        "                                    return (\n",
        "                                      <span \n",
        "                                        className=\"text-[8.5px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-300 uppercase whitespace-nowrap shadow-2xs\" \n",
        "                                        title=\"Temporary Arrival Pending — Material has not arrived at mill gate yet\"\n",
        "                                      >\n",
        "                                        Temp Arrival Pending\n",
        "                                      </span>\n",
        "                                    );\n",
        "                                 }\n",
        "\n",
        "                                 // Stage 2: Final Arrival Pending (Temporary Arrival completed, Final Arrival missing)\n",
        "                                 if (stage === 'final_arrival_pending') {\n",
        "                                    return (\n",
        "                                      <span \n",
        "                                        className=\"text-[8.5px] font-extrabold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300 uppercase whitespace-nowrap shadow-2xs\" \n",
        "                                        title=\"Temporary Arrival Completed — Final Arrival (Final M.R) is Pending\"\n",
        "                                      >\n",
        "                                        Final Arrival Pending\n",
        "                                      </span>\n",
        "                                    );\n",
        "                                 }\n",
        "\n",
        "                                 // Stage 3: Mismatch (Final Arrival exists, but mismatch found with P.O / Sauda specs)\n",
        "                                 if (stage === 'mismatch') {\n",
        "                                    const diffFields = item.mismatch_fields?.length \n",
        "                                      ? item.mismatch_fields.join(', ') \n",
        "                                      : 'Fields differ';\n",
        "                                    return (\n",
        "                                      <span\n",
        "                                         className=\"text-[9px] font-black px-2 py-0.5 rounded bg-rose-100 text-rose-700 border border-rose-300 uppercase cursor-help shadow-2xs whitespace-nowrap inline-flex items-center gap-1\"\n",
        "                                         title={`Mismatch in: ${diffFields}. Resolve dispute in Mismatch Section.`}\n",
        "                                      >\n",
        "                                        <AlertTriangle className=\"w-2.5 h-2.5 text-rose-600 shrink-0\" />\n",
        "                                        <span>Mismatch</span>\n",
        "                                      </span>\n",
        "                                    );\n",
        "                                 }\n",
        "\n",
        "                                 // Stage 4: Inspection Pending (Final Arrival completed without mismatch, Mill Inspection pending)\n",
        "                                 if (stage === 'inspection_pending') {\n",
        "                                    return (\n",
        "                                      <span \n",
        "                                        className=\"text-[8.5px] font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 uppercase whitespace-nowrap shadow-2xs\" \n",
        "                                        title=\"Final Arrival exists with no mismatch — Mill Inspection data is Pending\"\n",
        "                                      >\n",
        "                                        Inspection Pending\n",
        "                                      </span>\n",
        "                                    );\n",
        "                                 }\n",
        "\n"
    ]
    lines[start_idx:end_idx] = new_chunk
    with open('src/pages/PurchaseOrder.tsx', 'w') as f:
        f.writelines(lines)
    print('SUCCESS')
else:
    print(f'Failed to find indices: start={start_idx}, end={end_idx}')
