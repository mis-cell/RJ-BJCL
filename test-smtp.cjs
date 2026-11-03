const nodemailer = require('nodemailer');
async function test() {
  const logs = [];
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: "rawjute@ballyjute.com",
      pass: "ochhyhnjlkhdlpot",
    },
    tls: {
      rejectUnauthorized: false
    },
    logger: {
      level: 'trace',
      trace: (...args) => logs.push({ type: 'trace', msg: args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ') }),
      debug: (...args) => logs.push({ type: 'debug', msg: args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ') }),
      info: (...args) => logs.push({ type: 'info', msg: args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ') }),
      warn: (...args) => logs.push({ type: 'warn', msg: args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ') }),
      error: (...args) => logs.push({ type: 'error', msg: args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ') }),
      fatal: (...args) => logs.push({ type: 'fatal', msg: args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ') })
    },
    debug: true
  });
  try {
    await transporter.verify();
    console.log(logs);
  } catch (err) {
    console.log(logs);
  }
}
test();
