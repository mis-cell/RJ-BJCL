const Imap = require('imap');

const imap = new Imap({
  user: 'rawjute@ballyjute.com',
  password: 'Longest#2026@',
  host: 'imap.gmail.com',
  port: 993,
  tls: true,
  tlsOptions: { rejectUnauthorized: false }
});

imap.once('ready', function() {
  console.log('Connected');
  imap.end();
});

imap.once('error', function(err) {
  console.log('Error:', err);
});

imap.connect();
