const imaps = require('imap-simple');
async function test() {
  try {
    await imaps.connect({
      imap: {
        user: "rawjute@ballyjute.com",
        password: "wrongpassword",
        host: "imap.gmail.com",
        port: 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false },
        authTimeout: 5000
      }
    });
    console.log("Success");
  } catch (err) {
    console.log("ERROR MESSAGE IS:", err.message);
  }
}
test();
