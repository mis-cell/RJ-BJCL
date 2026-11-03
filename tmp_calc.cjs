const fs = require('fs');
let code = fs.readFileSync('src/pages/PurchaseOrder.tsx', 'utf8');

const target1 = `  const handleCalculateOk = () => {
    const lorries = parseFloat(calcData.total_lorries) || 0;
    const unitsPerLorry = parseFloat(calcData.units_per_lorry) || 0;
    const wtPerLorry = parseFloat(calcData.weight_per_lorry) || 0;
    
    const totalUnits = lorries * unitsPerLorry;
    const totalContractMt = lorries * wtPerLorry;
    const isBales = formData.purchase_unit_name === 'BALES';
    const weightUnitKgs = isBales ? '147.5' : (unitsPerLorry > 0 ? ((wtPerLorry * 1000) / unitsPerLorry).toFixed(2) : '50');
    const unitWtVal = parseFloat(weightUnitKgs);
    
    let updatedItems = recalculateItemWeights(formData.items, unitWtVal);
    
    // Auto-fill quantity if there's exactly one item row
    if (updatedItems.length === 1) {
      updatedItems[0].qty = totalUnits;
      updatedItems[0].weight = parseFloat(((totalUnits * unitWtVal) / 1000).toFixed(3));
    }

    setFormData(prev => ({
      ...prev,
      total_no_of_lorries: calcData.total_lorries,
      units_per_lorry: calcData.units_per_lorry,
      weight_per_lorry: calcData.weight_per_lorry,
      total_units: totalUnits.toString(),
      total_contract_mt: totalContractMt.toFixed(3),
      weight_unit_kgs: weightUnitKgs.toString(),
      items: updatedItems
    }));
    setIsCalcOpen(false);
  };`;

const replacement1 = `  const handleCalculateOk = () => {
    const lorries = parseFloat(calcData.total_lorries) || 0;
    const unitsPerLorry = parseFloat(calcData.units_per_lorry) || 0;
    const isBales = formData.purchase_unit_name === 'BALES';
    
    // For Bales, derive the true weight per lorry from the units to avoid the "total weight" input confusion
    const trueWtPerLorry = isBales ? (unitsPerLorry * 147.5) / 1000 : (parseFloat(calcData.weight_per_lorry) || 0);
    
    const totalUnits = lorries * unitsPerLorry;
    const totalContractMt = lorries * trueWtPerLorry;
    const weightUnitKgs = isBales ? '147.5' : (unitsPerLorry > 0 ? ((trueWtPerLorry * 1000) / unitsPerLorry).toFixed(2) : '50');
    const unitWtVal = parseFloat(weightUnitKgs);
    
    let updatedItems = recalculateItemWeights(formData.items, unitWtVal);
    
    // Auto-fill quantity if there's exactly one item row
    if (updatedItems.length === 1) {
      updatedItems[0].qty = totalUnits;
      updatedItems[0].weight = parseFloat(((totalUnits * unitWtVal) / 1000).toFixed(3));
    }

    setFormData(prev => ({
      ...prev,
      total_no_of_lorries: calcData.total_lorries,
      units_per_lorry: calcData.units_per_lorry,
      weight_per_lorry: isBales && trueWtPerLorry > 0 ? trueWtPerLorry.toFixed(3) : calcData.weight_per_lorry,
      total_units: totalUnits.toString(),
      total_contract_mt: totalContractMt.toFixed(3),
      weight_unit_kgs: weightUnitKgs.toString(),
      items: updatedItems
    }));
    setIsCalcOpen(false);
  };`;

code = code.replace(target1, replacement1);

const target2 = `                            onChange={(e) => setCalcData({...calcData, total_lorries: e.target.value})}`;
const replacement2 = `                            onChange={(e) => {
                              const val = e.target.value;
                              setCalcData(prev => {
                                const next = { ...prev, total_lorries: val };
                                if (formData.purchase_unit_name === 'BALES') {
                                  const totalWt = parseFloat(prev.weight_per_lorry) || 0;
                                  const lorries = parseFloat(val) || 1;
                                  const totalUnits = Math.round((totalWt * 1000) / 147.5);
                                  next.units_per_lorry = Math.round(totalUnits / lorries).toString();
                                }
                                return next;
                              });
                            }}`;
code = code.replace(target2, replacement2);

const target3 = `                            onChange={(e) => {
                              const val = e.target.value;
                              setCalcData(prev => {
                                const next = { ...prev, weight_per_lorry: val };
                                if (formData.purchase_unit_name === 'BALES') {
                                  const wtPerLorry = parseFloat(val) || 0;
                                  const unitsPerLorry = (wtPerLorry * 1000) / 147.5;
                                  next.units_per_lorry = Math.round(unitsPerLorry).toString();
                                }
                                return next;
                              });
                            }}`;
const replacement3 = `                            onChange={(e) => {
                              const val = e.target.value;
                              setCalcData(prev => {
                                const next = { ...prev, weight_per_lorry: val };
                                if (formData.purchase_unit_name === 'BALES') {
                                  const totalWt = parseFloat(val) || 0;
                                  const lorries = parseFloat(prev.total_lorries) || 1;
                                  const totalUnits = Math.round((totalWt * 1000) / 147.5);
                                  next.units_per_lorry = Math.round(totalUnits / lorries).toString();
                                }
                                return next;
                              });
                            }}`;
code = code.replace(target3, replacement3);

fs.writeFileSync('src/pages/PurchaseOrder.tsx', code);
console.log('updated');
