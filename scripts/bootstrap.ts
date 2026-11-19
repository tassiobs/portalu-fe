import axios from "axios";
import * as fs from "fs";
import * as path from "path";

const BASE = "https://portalu-production.up.railway.app";
const ENV_PATH = path.join(__dirname, "../.env.local");

const CONFIG = {
  org_name: "portalu1",
  email: "tassiobatista.pm+123@gmail.com",
  password: "Portalu@2024!",
  name: "Admin",
  portal_name: "portalu1",
  portal_slug: "portalu1",
  portal_description: "Portalu Demo Portal",
  rt_name: "General Inquiry",
  rt_description: "Submit a general inquiry to our team",
};

function log(msg: string) {
  console.log(`[bootstrap] ${msg}`);
}

function writeEnv(vars: Record<string, string>) {
  let existing = "";
  if (fs.existsSync(ENV_PATH)) {
    existing = fs.readFileSync(ENV_PATH, "utf-8");
  }

  const lines = existing.split("\n").filter((l) => {
    const key = l.split("=")[0];
    return !Object.keys(vars).includes(key);
  });

  for (const [k, v] of Object.entries(vars)) {
    lines.push(`${k}=${v}`);
  }

  fs.writeFileSync(ENV_PATH, lines.filter(Boolean).join("\n") + "\n");
  log(`Wrote to .env.local: ${Object.keys(vars).join(", ")}`);
}

async function main() {
  let accessToken = "";

  // Step 1: Sign up
  log("Creating org and admin user…");
  try {
    const { data: signUpData } = await axios.post(`${BASE}/api/v1/auth/sign-up`, {
      org_name: CONFIG.org_name,
      email: CONFIG.email,
      password: CONFIG.password,
      name: CONFIG.name,
    });

    writeEnv({
      NEXT_PUBLIC_API_BASE_URL: BASE,
    });

    // Step 2: Auto-verify email if token is in response
    const verificationToken = signUpData?.verification_token ?? signUpData?.user?.verification_token;
    if (verificationToken) {
      log("Auto-verifying email…");
      await axios.post(`${BASE}/api/v1/auth/verify-email`, { token: verificationToken });
      log("Email verified.");
    } else {
      log("No verification_token in response — skipping auto-verify (verify manually if needed).");
    }
  } catch (err: unknown) {
    const e = err as { response?: { status?: number; data?: { detail?: string } } };
    if (e.response?.status === 409) {
      log("Org already exists (409) — skipping sign-up, proceeding to sign-in.");
    } else {
      console.error("Sign-up failed:", e.response?.data ?? err);
      process.exit(1);
    }
  }

  // Step 3: Sign in
  log("Signing in…");
  try {
    const { data: authData } = await axios.post(`${BASE}/api/v1/auth/sign-in`, {
      email: CONFIG.email,
      password: CONFIG.password,
    });
    accessToken = authData.access_token;
    log("Signed in successfully.");
  } catch (err: unknown) {
    const e = err as { response?: { data?: unknown } };
    console.error("Sign-in failed:", e.response?.data ?? err);
    process.exit(1);
  }

  const headers = { Authorization: `Bearer ${accessToken}` };

  // Step 4: Create portal
  let portalId = "";
  log("Creating portal…");
  try {
    const { data: portalData } = await axios.post(
      `${BASE}/api/v1/org/portals`,
      { name: CONFIG.portal_name, slug: CONFIG.portal_slug, description: CONFIG.portal_description },
      { headers }
    );
    portalId = portalData.id;
    log(`Portal created: ${portalId}`);
  } catch (err: unknown) {
    const e = err as { response?: { status?: number; data?: { detail?: string } } };
    if (e.response?.status === 409) {
      log("Portal already exists (409) — fetching existing portal.");
      const { data: portals } = await axios.get(`${BASE}/api/v1/org/portals`, { headers });
      const existing = portals.find((p: { slug: string; id: string }) => p.slug === CONFIG.portal_slug);
      if (!existing) { console.error("Could not find existing portal."); process.exit(1); }
      portalId = existing.id;
      log(`Using existing portal: ${portalId}`);
    } else {
      console.error("Portal creation failed:", e.response?.data ?? err);
      process.exit(1);
    }
  }

  // Step 5: Create request type
  let rtId = "";
  log("Creating request type…");
  try {
    const { data: rtData } = await axios.post(
      `${BASE}/api/v1/org/portals/${portalId}/request-types`,
      { name: CONFIG.rt_name, description: CONFIG.rt_description },
      { headers }
    );
    rtId = rtData.id;
    log(`Request type created: ${rtId}`);
  } catch (err: unknown) {
    const e = err as { response?: { status?: number; data?: unknown } };
    if (e.response?.status === 409) {
      log("Request type already exists — fetching existing.");
      const { data: types } = await axios.get(`${BASE}/api/v1/org/portals/${portalId}/request-types`, { headers });
      const existing = types.find((t: { name: string; id: string }) => t.name === CONFIG.rt_name);
      if (!existing) { console.error("Could not find existing request type."); process.exit(1); }
      rtId = existing.id;
      log(`Using existing request type: ${rtId}`);
    } else {
      console.error("Request type creation failed:", e.response?.data ?? err);
      process.exit(1);
    }
  }

  // Step 6: Add fields
  const fieldsUrl = `${BASE}/api/v1/org/portals/${portalId}/request-types/${rtId}/fields`;

  const fields = [
    { label: "Full Name", field_type: "text", required: true, order: 1 },
    {
      label: "Category",
      field_type: "select",
      required: true,
      order: 2,
      options: ["General", "Billing", "Technical", "Other"],
    },
    { label: "Description", field_type: "textarea", required: true, order: 3 },
  ];

  const existingFields = await axios.get(fieldsUrl, { headers }).then((r) => r.data as { label: string }[]);

  for (const field of fields) {
    if (existingFields.some((f) => f.label === field.label)) {
      log(`Field "${field.label}" already exists — skipping.`);
      continue;
    }
    try {
      await axios.post(fieldsUrl, field, { headers });
      log(`Field added: ${field.label}`);
    } catch (err: unknown) {
      const e = err as { response?: { data?: unknown } };
      console.error(`Failed to add field "${field.label}":`, e.response?.data ?? err);
    }
  }

  // Step 7: Write .env.local
  writeEnv({
    NEXT_PUBLIC_API_BASE_URL: BASE,
    NEXT_PUBLIC_ORG_SLUG: CONFIG.portal_slug, // org slug = portalu1
    NEXT_PUBLIC_PORTAL_SLUG: CONFIG.portal_slug,
    NEXT_PUBLIC_PORTAL_ID: portalId,
    NEXT_PUBLIC_REQUEST_TYPE_ID: rtId,
  });

  log("Bootstrap complete!");
  log(`Admin email: ${CONFIG.email}`);
  log(`Admin password: ${CONFIG.password}`);
  log(`Citizen portal: http://localhost:3000/portal/portalu1/portalu1`);
  log(`Admin portal:   http://localhost:3000/admin/login`);
}

main();
