const imaps = require('imap-simple');

const config = {
    imap: {
        user: 'rawjute@ballyjute.com',
        password: 'Longest#2026@',
        host: 'mail.ballyjute.com',
        port: 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false },
        authTimeout: 5000
    }
};

imaps.connect(config).then(function (connection) {
    console.log('Connected!');
    return connection.openBox('INBOX').then(function () {
        var searchCriteria = ['ALL'];
        var fetchOptions = {
            bodies: ['HEADER', 'TEXT'],
            markSeen: false
        };
        return connection.search(searchCriteria, fetchOptions).then(function (results) {
            console.log('Got messages:', results.length);
            connection.end();
        });
    });
}).catch(err => {
    console.error('Error:', err);
});
