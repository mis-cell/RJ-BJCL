const fs = require('fs');
let code = fs.readFileSync('src/pages/SmsSaudaDesk.tsx', 'utf8');

// Add import
const importStr = `import { initAuth, googleSignIn, getAccessToken, logout } from '../lib/firebaseAuth';\n`;
if (!code.includes('initAuth')) {
    code = code.replace(/import React, \{ useState, useEffect \} from 'react';/, `import React, { useState, useEffect } from 'react';\n${importStr}`);
}

// Replace dummy data
const startStr = `  const [gmailList, setGmailList] = useState<any[]>([`;
const endStr = `  ]);\n\n  // API Feed state for SMS`;
const endStrAlt = `  ]);\n  // API Feed state for SMS`;

let startIndex = code.indexOf(startStr);
let endIndex = code.indexOf(endStr);
let endLen = endStr.length;

if (endIndex === -1) {
    endIndex = code.indexOf(endStrAlt);
    endLen = endStrAlt.length;
}

if (startIndex !== -1 && endIndex !== -1) {
    const replacement = `  const [gmailList, setGmailList] = useState<any[]>([]);
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
  };

  // API Feed state for SMS`;

    const newCode = code.slice(0, startIndex) + replacement + code.slice(endIndex + endLen);
    fs.writeFileSync('src/pages/SmsSaudaDesk.tsx', newCode);
    console.log('Successfully replaced dummy data with Gmail fetching logic.');
} else {
    console.log('Failed to find replacement anchors.');
    console.log('startIndex', startIndex, 'endIndex', endIndex);
}
