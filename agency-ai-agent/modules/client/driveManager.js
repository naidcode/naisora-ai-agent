// modules/client/driveManager.js
// Manages client file organisation
// Creates folder structure for each client project

const { sendMessage: sendTelegramAlert } = require('../../config/telegram');

// ─── Generate folder structure guide ─────────────────────────────────────────
async function createClientFolderStructure(client) {
  const folderStructure = `
📁 Naisora — Clients
└── 📁 ${client.business_name} (${client.area})
    ├── 📁 01 — Branding
    │   ├── logo.png
    │   ├── brand-colors.pdf
    │   └── fonts/
    ├── 📁 02 — Website
    │   ├── designs/
    │   ├── content/
    │   └── photos/
    ├── 📁 03 — SEO
    │   ├── keyword-research.xlsx
    │   ├── audit-reports/
    │   └── blog-drafts/
    ├── 📁 04 — Reports
    │   ├── monthly-reports/
    │   └── ranking-screenshots/
    └── 📁 05 — Invoices
        └── invoices/
`;

  await sendTelegramAlert(
    `📁 *Client Folder Created — ${client.business_name}*\n\n` +
    `Create this structure in Google Drive:\n\`\`\`${folderStructure}\`\`\`\n\n` +
    `Share the main folder with: hello@naisora.com`
  );

  return folderStructure;
}

module.exports = { createClientFolderStructure };