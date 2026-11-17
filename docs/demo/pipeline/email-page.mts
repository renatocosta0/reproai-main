import { buildInvitationEmail } from "../../../src/lib/email/index.ts";
import { writeFileSync } from "node:fs";
const e = buildInvitationEmail("https://reproai.example/register?token=repro_inv_EXAMPLE");
// A plain, unbranded mail view: sender, subject, then the real invitation HTML.
const head = `<div style="font-family:Arial,sans-serif;padding:18px 18px 10px;background:#fff;border-bottom:1px solid #e3eae6">
<div style="font-size:13px;color:#71817d">Inbox</div>
<div style="font-size:19px;font-weight:700;color:#173330;margin:8px 0 10px;line-height:1.3">${e.subject}</div>
<div style="display:flex;gap:10px;align-items:center"><div style="width:36px;height:36px;border-radius:50%;background:#0c655e;color:#fff;display:grid;place-items:center;font-weight:700">R</div>
<div><div style="font-size:14px;font-weight:600;color:#173330">ReproAI</div><div style="font-size:12px;color:#71817d">to me · just now</div></div></div></div>`;
const html = e.html.replace("<body style=\"", "<body style=\"padding:0;").replace(/<body([^>]*)>/, `<body$1>${head}`);
writeFileSync(process.argv[2], html.replace("<!doctype html><html>", "<!doctype html><html><head><meta name=viewport content=\"width=device-width,initial-scale=1\"></head>"));
