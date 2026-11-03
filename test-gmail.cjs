const { google } = require('googleapis');

const gmail = google.gmail({
    version: 'v1',
    auth: 'AIzaSyBbA1sPH8w8_rKUx8sP72uV-BulSSMNydA'
});

gmail.users.messages.list({
    userId: 'rawjute@ballyjute.com'
}).then(res => {
    console.log(res.data);
}).catch(err => {
    console.error(err.message);
});
