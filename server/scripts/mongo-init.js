// MongoDB initialization script
db = db.getSiblingDB('reachinbox');

// Create collections
db.createCollection('users');
db.createCollection('emailaccounts');
db.createCollection('emails');
db.createCollection('knowledgebase');

// Create indexes for better performance
db.emails.createIndex({ "messageId": 1 }, { unique: true });
db.emails.createIndex({ "accountId": 1 });
db.emails.createIndex({ "date": -1 });
db.emails.createIndex({ "aiCategory": 1 });
db.emails.createIndex({ "from": 1 });
db.emails.createIndex({ "subject": "text", "textBody": "text" });

db.emailaccounts.createIndex({ "email": 1 }, { unique: true });
db.emailaccounts.createIndex({ "userId": 1 });

print('Database initialized successfully!');
