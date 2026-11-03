const fs = require('fs');
let code = fs.readFileSync('src/pages/ConfigGuide.tsx', 'utf8');

const newSection = `
        {/* Email Configuration & Diagnostics */}
        <div className="col-span-12 font-sans mb-4">
          <LegacyFieldset legend="Email Configuration & Diagnostics">
            <div className="p-3 bg-white space-y-4">
              <div className="text-xs text-slate-700">
                Test outbound email delivery. This will dispatch a dummy 'System Check' payload utilizing configured SMTP credentials to verify routing without triggering real business alert sequences.
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={async (e) => {
                    const btn = e.currentTarget;
                    const prevText = btn.innerText;
                    btn.innerText = "TESTING...";
                    btn.disabled = true;
                    try {
                      const res = await fetch("/api/send-email", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          to: "rawjute@ballyjute.com",
                          subject: "[SYSTEM TEST] SMTP Diagnostic Verification",
                          html: "<div style='font-family: monospace; padding: 20px;'><h3>BALLY JUTE ERP: SMTP Diagnostic</h3><p>This is an automated system verification email. If you received this, the SMTP routing configuration is operational.</p><p>Timestamp: " + new Date().toISOString() + "</p></div>"
                        })
                      });
                      let data;
                      try {
                        data = await res.json();
                      } catch (err) {
                        const txt = await res.text().catch(()=>'');
                        throw new Error("Invalid response: " + txt.substring(0,100));
                      }
                      if (data.success) {
                        alert("Diagnostic Test Passed! Email dispatched via: " + data.provider);
                      } else {
                        alert("Diagnostic Failed: " + data.error);
                      }
                    } catch (err) {
                      alert("Diagnostic Errored: " + err.message);
                    } finally {
                      btn.innerText = prevText;
                      btn.disabled = false;
                    }
                  }}
                  className="px-4 py-2 bg-[#000080] hover:bg-blue-900 text-white font-bold text-[10px] uppercase tracking-widest rounded-sm transition-colors border border-black shadow-[inset_1px_1px_0_rgba(255,255,255,0.4),2px_2px_0_rgba(0,0,0,0.4)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
                >
                  Diagnostic Connection Test
                </button>
              </div>
            </div>
          </LegacyFieldset>
        </div>
`;

if (!code.includes('Email Configuration & Diagnostics')) {
    code = code.replace(/\{\/\* Final Arrival Sync Diagnostics Center \*\/\}/, newSection + '\n        {/* Final Arrival Sync Diagnostics Center */}');
    fs.writeFileSync('src/pages/ConfigGuide.tsx', code);
    console.log("Patched ConfigGuide.");
}
