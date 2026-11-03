path = "src/pages/PurchaseOrder.tsx"
with open(path, "r") as f:
    text = f.read()

sub = "setCalcData({\n                              total_lorries: formData.total_no_of_lorries || '0',\n                              units_per_lorry: formData.units_per_lorry || '0',\n                              weight_per_lorry: formData.weight_per_lorry || '0'\n                           });"

idx = text.find(sub)
if idx != -1:
    replacement = "setCalcData({\n                              total_lorries: formData.total_no_of_lorries || '0',\n                              units_per_lorry: formData.units_per_lorry || '0',\n                              total_units: formData.total_units || '0',\n                              weight_per_lorry: formData.weight_per_lorry || '0'\n                           } as any);"
    text = text[:idx] + replacement + text[idx+len(sub):]
    with open(path, "w") as f:
        f.write(text)
    print("SUCCESS")
else:
    print("SUB NOT FOUND")
