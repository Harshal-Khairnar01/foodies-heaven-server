const fs = require('fs-extra');

async function copyEjsFiles() {
    try {
        await fs.copy('./mails', './build/mails');
        console.log('✅ EJS files copied successfully!');
    } catch (err) {
        console.error('❌ Error copying EJS files:', err);
    }
}

copyEjsFiles();
