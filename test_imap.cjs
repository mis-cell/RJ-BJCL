const imaps = require('imap-simple');
async function test() {
  try {
    const config = {
      imap: {
        user: "rawjute@ballyjute.com",
        password: "wrongpassword",
        host: "imap.gmail.com",
        port: 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false },
        authTimeout: 5000
      }
    };
    await imaps.connect(config);
    console.log("Connected");
  } catch (err) {
    console.log("Caught:", err.message);
  }
}
test();
