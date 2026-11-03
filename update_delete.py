import re

with open("src/pages/PurchaseOrder.tsx", "r") as f:
    content = f.read()

target = """      if (supabase) {
        await supabase.from('purchase_detail_master').delete().eq('po_no', poNo);
        await supabase.from('temporary_po_details').delete().eq('po_no', poNo);
      }
      await dbModule.delete(MASTER_TABLE, 'po_no', poNo);"""

replacement = """      if (supabase) {
        await supabase.from('purchase_detail_master').delete().eq('po_no', poNo);
        await supabase.from('temporary_po_details').delete().eq('po_no', poNo);
        await supabase.from('temporary_po').delete().eq('po_no', poNo);
      }
      await dbModule.delete(MASTER_TABLE, 'po_no', poNo);
      // Extra cleanup just in case it's in purchase_master when temp or vice versa
      await dbModule.delete('purchase_master', 'po_no', poNo).catch(() => {});
      await dbModule.delete('p.o_archive', 'po_no', poNo).catch(() => {});
"""

if target in content:
    content = content.replace(target, replacement)
    print("Updated successfully")
else:
    print("Target not found")

with open("src/pages/PurchaseOrder.tsx", "w") as f:
    f.write(content)

