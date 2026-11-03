import React, { useState, useRef, useEffect } from 'react';
import { Terminal, PlayCircle, Server, Activity, ShieldAlert, CheckCircle2, X } from 'lucide-react';
import { LegacyFieldset } from '../LegacyLayout';
import { getApiUrl } from '../../lib/utils';

export default function SMTPDiagnosticTab() {
  const [logs, setLogs] = useState<any[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [host, setHost] = useState("smtp.gmail.com");
  const [port, setPort] = useState(465);
  const [user, setUser] = useState("rawjute@ballyjute.com");
  const [pass, setPass] = useState("ochhyhnjlkhdlpot");
  const [secure, setSecure] = useState(true);
  
  const consoleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [logs]);

  const runTest = async () => {
    setIsRunning(true);
    setLogs([{ type: 'info', time: new Date().toISOString(), msg: `Initiating SMTP Handshake to ${host}:${port}...` }]);
    
    try {
      const res = await fetch(getApiUrl('/api/test-smtp'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ host, port, secure, user, pass })
      });
      
      const data = await res.json();
      
      if (data.logs) {
        setLogs(prev => [...prev, ...data.logs]);
      }
      
      if (data.success) {
        setLogs(prev => [...prev, { type: 'success', time: new Date().toISOString(), msg: '✅ AUTHENTICATION SUCCESSFUL. Handshake completed.' }]);
      } else {
        setLogs(prev => [...prev, { type: 'error', time: new Date().toISOString(), msg: '❌ AUTHENTICATION FAILED: ' + data.error }]);
      }
      
    } catch (err: any) {
      setLogs(prev => [...prev, { type: 'error', time: new Date().toISOString(), msg: '❌ NETWORK ERROR: ' + err.message }]);
    } finally {
      setIsRunning(false);
    }
  };

  const getLogColor = (type: string, msg: string) => {
    if (type === 'error' || type === 'fatal' || msg.includes('535') || msg.includes('554') || msg.includes('FAILED')) return 'text-red-400';
    if (type === 'warn') return 'text-yellow-400';
    if (type === 'success' || msg.includes('235') || msg.includes('250') || msg.includes('SUCCESSFUL')) return 'text-green-400';
    if (type === 'trace' || type === 'debug') return 'text-slate-400';
    return 'text-blue-300';
  };

  return (
    <div className="space-y-4 font-sans animate-fade-in max-w-6xl mx-auto">
      <div className="flex items-center gap-2 mb-2 pb-2 border-b-2 border-black">
        <Activity className="h-5 w-5" />
        <h2 className="text-sm font-black tracking-widest uppercase">SMTP Diagnostic Console</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="col-span-1 space-y-4">
          <LegacyFieldset legend="Target Server">
            <div className="space-y-3 p-1">
              <div className="flex flex-col gap-1">
                <label htmlFor="smtp_host_76" className="text-[10px] font-bold uppercase tracking-wider text-slate-700">SMTP Host</label>
                <input  id="smtp_host_76" name="smtp_host" aria-label="SMTP Host"
                  type="text"
                  className="w-full text-xs border border-black/20 rounded bg-white px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-black disabled:bg-slate-100 disabled:text-slate-500"
                  value={host} 
                  onChange={(e) => setHost(e.target.value)} 
                  disabled={isRunning}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label htmlFor="port_88" className="text-[10px] font-bold uppercase tracking-wider text-slate-700">Port</label>
                  <input  id="port_88" name="port" aria-label="Port"
                    type="number"
                    className="w-full text-xs border border-black/20 rounded bg-white px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-black disabled:bg-slate-100 disabled:text-slate-500"
                    value={port} 
                    onChange={(e) => setPort(Number(e.target.value))} 
                    disabled={isRunning}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="ssl_tls_98" className="text-[10px] font-bold uppercase tracking-wider text-slate-700">SSL/TLS</label>
                  <select  id="ssl_tls_98" name="ssl_tls" aria-label="SSL/TLS"
                    className="w-full text-xs border border-black/20 rounded bg-white px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-black disabled:bg-slate-100 disabled:text-slate-500"
                    value={secure ? "true" : "false"}
                    onChange={(e) => setSecure(e.target.value === "true")}
                    disabled={isRunning}
                  >
                    <option value="true">Yes (465)</option>
                    <option value="false">No / STARTTLS (587/25)</option>
                  </select>
                </div>
              </div>
            </div>
          </LegacyFieldset>

          <LegacyFieldset legend="Authentication">
            <div className="space-y-3 p-1">
              <div className="flex flex-col gap-1">
                <label htmlFor="username_email_116" className="text-[10px] font-bold uppercase tracking-wider text-slate-700">Username / Email</label>
                <input  id="username_email_116" name="username_email" aria-label="Username / Email"
                  type="text"
                  className="w-full text-xs border border-black/20 rounded bg-white px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-black disabled:bg-slate-100 disabled:text-slate-500"
                  value={user} 
                  onChange={(e) => setUser(e.target.value)} 
                  disabled={isRunning}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="app_password_126" className="text-[10px] font-bold uppercase tracking-wider text-slate-700">App Password</label>
                <input  id="app_password_126" name="app_password" aria-label="App Password"
                  type="password"
                  className="w-full text-xs border border-black/20 rounded bg-white px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-black disabled:bg-slate-100 disabled:text-slate-500"
                  value={pass} 
                  onChange={(e) => setPass(e.target.value)} 
                  disabled={isRunning}
                />
              </div>
              
              <div className="pt-2">
                <button 
                  onClick={runTest}
                  disabled={isRunning}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#D94B5A] hover:bg-blue-900 text-white font-bold text-xs uppercase tracking-widest rounded-sm transition-colors border border-black shadow-[inset_1px_1px_0_rgba(255,255,255,0.4),2px_2px_0_rgba(0,0,0,0.4)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRunning ? (
                    <><Activity className="h-4 w-4 animate-spin" /> Executing Handshake...</>
                  ) : (
                    <><PlayCircle className="h-4 w-4" /> Run Connection Test</>
                  )}
                </button>
              </div>
            </div>
          </LegacyFieldset>
          
          <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg flex gap-3 text-xs text-blue-800">
            <ShieldAlert className="h-5 w-5 flex-shrink-0 text-blue-500" />
            <div>
              <strong>Debugging 535 5.7.8 Errors:</strong><br />
              If you receive an Authentication Failed error, ensure that 2-Step Verification is enabled on your Google Account and that you are using a generated <strong>App Password</strong> rather than your standard account password.
            </div>
          </div>
        </div>

        <div className="col-span-1 lg:col-span-2 flex flex-col h-[500px]">
          <div className="bg-slate-900 border border-black rounded-t-lg px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-slate-400" />
              <span className="text-xs font-mono text-slate-300">Live SMTP Handshake Monitor</span>
            </div>
            <div className="flex gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-red-500"></div>
              <div className="h-2.5 w-2.5 rounded-full bg-yellow-500"></div>
              <div className="h-2.5 w-2.5 rounded-full bg-green-500"></div>
            </div>
          </div>
          
          <div 
            ref={consoleRef}
            className="flex-1 bg-black border-x border-b border-black p-4 font-mono text-[11px] leading-relaxed overflow-auto text-slate-300 rounded-b-lg shadow-inner"
          >
            {logs.length === 0 ? (
              <div className="text-slate-600 h-full flex flex-col items-center justify-center italic">
                <Server className="h-12 w-12 mb-4 opacity-20" />
                No connection data. Click 'Run Connection Test' to initiate handshake.
              </div>
            ) : (
              <div className="space-y-1">
                {logs.map((log, idx) => (
                  <div key={idx} className={`break-words ${getLogColor(log.type, log.msg)}`}>
                    <span className="opacity-50 mr-2">[{new Date(log.time).toLocaleTimeString('en-US', { hour12: false, fractionalSecondDigits: 3 })}]</span>
                    <span className="font-bold mr-2 uppercase">[{log.type}]</span>
                    {log.msg.split('\n').map((line: string, i: number) => (
                      <span key={i}>
                        {i > 0 && <br />}
                        {line}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
