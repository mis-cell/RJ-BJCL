const fs = require('fs');
let code = fs.readFileSync('src/pages/SmsSaudaDesk.tsx', 'utf8');

// Remove Firebase Auth import
code = code.replace(/import \{ initAuth, googleSignIn, getAccessToken, logout \} from '\.\.\/lib\/firebaseAuth';\n/, '');

const oldFetchStrStart = `  const [gmailList, setGmailList] = useState<any[]>([]);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isFetchingGmail, setIsFetchingGmail] = useState(false);

  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setNeedsAuth(false);
        fetchGmailInbox(token);
      },
      () => setNeedsAuth(true)
    );
    return () => unsubscribe();
  }, []);

  const fetchGmailInbox = async (token: string) => {
    setIsFetchingGmail(true);
    try {
      const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages?q=in:inbox&maxResults=10', {
        headers: { Authorization: \`Bearer \${token}\` }
      });
      if (res.status === 401) {
        setNeedsAuth(true);
        setIsFetchingGmail(false);
        return;
      }
      const data = await res.json();
      
      if (!data.messages) {
        setGmailList([]);
        return;
      }
      
      const emailDetails = await Promise.all(
        data.messages.map(async (msg: any) => {
          const msgRes = await fetch(\`https://gmail.googleapis.com/gmail/v1/users/me/messages/\${msg.id}?format=full\`, {
            headers: { Authorization: \`Bearer \${token}\` }
          });
          const msgData = await msgRes.json();
          
          const headers = msgData.payload?.headers || [];
          const subject = headers.find((h: any) => h.name.toLowerCase() === 'subject')?.value || 'No Subject';
          const from = headers.find((h: any) => h.name.toLowerCase() === 'from')?.value || 'Unknown Sender';
          const date = headers.find((h: any) => h.name.toLowerCase() === 'date')?.value || '';
          
          let senderName = from;
          let senderEmail = from;
          const fromMatch = from.match(/(.*)<(.*)>/);
          if (fromMatch) {
            senderName = fromMatch[1].trim() || fromMatch[2];
            senderEmail = fromMatch[2].trim();
          }

          let body = msgData.snippet;
          if (msgData.payload?.parts && msgData.payload.parts.length > 0) {
            const part = msgData.payload.parts.find((p: any) => p.mimeType === 'text/plain');
            if (part && part.body && part.body.data) {
               body = atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
            }
          } else if (msgData.payload?.body && msgData.payload.body.data) {
             body = atob(msgData.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
          }

          return {
            id: msg.id,
            senderName,
            senderEmail,
            subject,
            date,
            snippet: msgData.snippet,
            body: body,
            starred: false,
            unread: msgData.labelIds?.includes('UNREAD')
          };
        })
      );
      
      setGmailList(emailDetails);
    } catch (err) {
      console.error('Error fetching gmail:', err);
    } finally {
      setIsFetchingGmail(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setNeedsAuth(false);
        fetchGmailInbox(result.accessToken);
      }
    } catch (err) {
      console.error('Login failed:', err);
    } finally {
      setIsLoggingIn(false);
    }
  };`;

const newFetchStr = `  const [gmailList, setGmailList] = useState<any[]>([]);
  const [isFetchingGmail, setIsFetchingGmail] = useState(false);
  const [gmailError, setGmailError] = useState('');

  useEffect(() => {
    fetchEmails();
  }, []);

  const fetchEmails = async () => {
    setIsFetchingGmail(true);
    setGmailError('');
    try {
      const res = await fetch('/api/fetch-emails');
      const data = await res.json();
      if (data.success && data.emails) {
        setGmailList(data.emails);
      } else {
        setGmailError(data.error || 'Failed to fetch emails');
      }
    } catch (err: any) {
      console.error('Error fetching emails:', err);
      setGmailError(err.message);
    } finally {
      setIsFetchingGmail(false);
    }
  };`;

if (code.includes(oldFetchStrStart)) {
    code = code.replace(oldFetchStrStart, newFetchStr);
    console.log("Fetch logic replaced.");
} else {
    console.log("Could not find old fetch logic");
}

const oldUIStr = `                    <div className="flex-1 overflow-y-auto divide-y divide-slate-150">
                      {(() => {
                        if (needsAuth) {
                           return (
                             <div className="flex flex-col items-center justify-center p-8 text-center mt-10">
                               <div className="text-slate-500 mb-4 font-mono text-sm">Connect Gmail to view raw jute emails</div>
                               <button onClick={handleGoogleLogin} disabled={isLoggingIn} className="flex items-center gap-2 bg-white border border-slate-300 shadow-sm text-slate-700 px-4 py-2 font-medium hover:bg-slate-50">
                                  <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /><path fill="none" d="M1 1h22v22H1z" /></svg>
                                  {isLoggingIn ? 'Connecting...' : 'Sign in with Google'}
                               </button>
                             </div>
                           );
                        }
                        if (isFetchingGmail) {
                           return <div className="p-8 text-center font-mono text-sm text-slate-500">Loading inbox...</div>;
                        }
                        const filtered = gmailList.filter(mail => {`;

const newUIStr = `                    <div className="flex-1 overflow-y-auto divide-y divide-slate-150">
                      {(() => {
                        if (isFetchingGmail) {
                           return <div className="p-8 text-center font-mono text-sm text-slate-500">Loading inbox...</div>;
                        }
                        if (gmailError) {
                           return (
                             <div className="p-8 text-center text-red-500 font-mono text-sm">
                               <div className="mb-2">Error connecting to IMAP</div>
                               <div className="text-xs opacity-70">{gmailError}</div>
                               <button onClick={fetchEmails} className="mt-4 px-3 py-1 bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200">Retry</button>
                             </div>
                           );
                        }
                        if (gmailList.length === 0) {
                           return <div className="p-8 text-center font-mono text-sm text-slate-500">No unread emails found via IMAP.</div>;
                        }
                        const filtered = gmailList.filter(mail => {`;

if (code.includes(oldUIStr)) {
    code = code.replace(oldUIStr, newUIStr);
    console.log("UI logic replaced.");
} else {
    console.log("Could not find old UI logic");
}

fs.writeFileSync('src/pages/SmsSaudaDesk.tsx', code);
