// Cloudflare Worker: Discord OAuth -> JWT -> Redirect to CAD
// Routes:
//  - GET /login     -> Redirect to Discord OAuth (identify)
//  - GET /callback  -> Exchange code, read KV for department, sign JWT, show loading + redirect
//
// Env bindings required (configure via Wrangler):
//  - ACRP_DEPT_UID (KV namespace, read-only) with keys: PBP, PBF, PSP, DOT, ACSO (JSON arrays of Discord user IDs)
//  - DISCORD_CLIENT_ID
//  - DISCORD_CLIENT_SECRET
//  - JWT_SECRET (HMAC-SHA256)
//  - FRONTEND_BASE_URL (optional; defaults to http://localhost:8000)

const DEPARTMENTS = ["PBP", "PBF", "PSP", "DOT", "ACSO"]; // Department KV keys
const OVERSEER_KEY = "01"; // Overseer special key

export default {
	async fetch(request, env, ctx) {
		const url = new URL(request.url);
		const path = url.pathname.replace(/\/$/, "");

		try {
			if (request.method === "GET" && path === "/login") {
				return await handleLogin(request, env);
			}
			if (request.method === "GET" && path === "/callback") {
				return await handleCallback(request, env);
			}

			return new Response("Not Found", { status: 404 });
		} catch (err) {
			console.error("Worker error:", err);
			return new Response("Internal Server Error", { status: 500 });
		}
	},
};

async function handleLogin(request, env) {
	const url = new URL(request.url);
	const redirectUri = `${url.origin}/callback`;

	const state = randomState();

	const discordAuthUrl = new URL("https://discord.com/api/oauth2/authorize");
	discordAuthUrl.searchParams.set("client_id", env.DISCORD_CLIENT_ID);
	discordAuthUrl.searchParams.set("response_type", "code");
	discordAuthUrl.searchParams.set("scope", "identify");
	discordAuthUrl.searchParams.set("redirect_uri", redirectUri);
	discordAuthUrl.searchParams.set("state", state);

	const headers = new Headers({ Location: discordAuthUrl.toString() });
	headers.append(
		"Set-Cookie",
		serializeCookie("oauth_state", state, {
			path: "/",
			httpOnly: true,
			secure: true,
			sameSite: "Lax",
			maxAge: 300, // 5 minutes
		})
	);

	return new Response(null, { status: 302, headers });
}

async function handleCallback(request, env) {
	const url = new URL(request.url);
	const code = url.searchParams.get("code");
	const state = url.searchParams.get("state");
	const cookies = parseCookies(request.headers.get("Cookie") || "");
	const cookieState = cookies["oauth_state"];

	if (!code) {
		return new Response("Missing authorization code", { status: 400 });
	}
	if (!state || !cookieState || state !== cookieState) {
		return new Response("Invalid state", { status: 400 });
	}

	const redirectUri = `${url.origin}/callback`;

	// Exchange code for token
	const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			client_id: env.DISCORD_CLIENT_ID,
			client_secret: env.DISCORD_CLIENT_SECRET,
			grant_type: "authorization_code",
			code,
			redirect_uri: redirectUri,
		}).toString(),
	});

	if (!tokenRes.ok) {
		const text = await tokenRes.text();
		console.error("Token exchange failed:", tokenRes.status, text);
		return new Response("Failed to exchange code", { status: 502 });
	}
	const tokenJson = await tokenRes.json();
	const accessToken = tokenJson.access_token;

	// Fetch user info
	const userRes = await fetch("https://discord.com/api/users/@me", {
		headers: { Authorization: `Bearer ${accessToken}` },
	});
	if (!userRes.ok) {
		const text = await userRes.text();
		console.error("User fetch failed:", userRes.status, text);
		return new Response("Failed to fetch user info", { status: 502 });
	}
	const user = await userRes.json();
	const uid = String(user.id);
	const username = user.global_name || user.username || "DiscordUser";
	const avatarHash = user.avatar;
	const avatar = avatarHash
		? `https://cdn.discordapp.com/avatars/${uid}/${avatarHash}.png?size=64`
		: `https://cdn.discordapp.com/embed/avatars/0.png`;

		// Determine department(s) by scanning KV keys
		const departments = await findDepartments(uid, env);

	// Build and sign JWT
	const now = Math.floor(Date.now() / 1000);
	const exp = now + 60 * 60 * 6; // 6 hours
		const payload = { uid, username, avatar, departments, exp };
	const token = await signJWT(payload, env.JWT_SECRET);

	const frontendBase = env.FRONTEND_BASE_URL || "http://localhost:8000";
	// Ensure we land on the actual CAD file
	const redirectTo = `${frontendBase.replace(/\/$/, "")}/cad.html?token=${encodeURIComponent(token)}`;

	// Clear state cookie and return loading + redirect page
	const headers = new Headers({ "Content-Type": "text/html; charset=utf-8" });
	headers.append(
		"Set-Cookie",
		serializeCookie("oauth_state", "", {
			path: "/",
			httpOnly: true,
			secure: true,
			sameSite: "Lax",
			maxAge: 0,
		})
	);
	headers.append("Cache-Control", "no-store");

	const html = `<!DOCTYPE html>
	<html lang="en">
		<head>
			<meta charset="utf-8" />
			<meta name="viewport" content="width=device-width, initial-scale=1" />
			<title>Loading…</title>
			<meta http-equiv="refresh" content="0;url=${escapeHtml(redirectTo)}" />
			<style>
				body { margin: 0; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; display: grid; place-items: center; min-height: 100vh; background: #0b1020; color: #e8eefc; }
				.card { text-align: center; padding: 2rem 2.5rem; border: 1px solid #243055; border-radius: 12px; background: #121a33; box-shadow: 0 4px 24px rgba(0,0,0,0.35); }
				.spin { width: 28px; height: 28px; border: 3px solid #3b4e89; border-top-color: #8fb3ff; border-radius: 50%; animation: s 0.8s linear infinite; margin: 0 auto 12px; }
				@keyframes s { to { transform: rotate(360deg); } }
				.muted { color: #a9b4d8; font-size: 0.95rem; }
			</style>
		</head>
		<body>
			<div class="card">
				<div class="spin"></div>
				<h1>Signing you in…</h1>
				<p class="muted">Redirecting to CAD</p>
			</div>
			<script>
				try { window.location.replace(${JSON.stringify(redirectTo)}); } catch (_) { window.location.href = ${JSON.stringify(redirectTo)}; }
			</script>
		</body>
	</html>`;

	return new Response(html, { status: 200, headers });
}

async function findDepartments(uid, env) {
	try {
		// Check Overseer first
		const overseerArr = await env.ACRP_DEPT_UID.get(OVERSEER_KEY, { type: "json" });
		if (Array.isArray(overseerArr) && includesUid(overseerArr, uid)) {
			// Overseer gets all departments
			return [...DEPARTMENTS];
		}

		// Otherwise gather all matching departments
		const found = [];
		for (const key of DEPARTMENTS) {
			const arr = await env.ACRP_DEPT_UID.get(key, { type: "json" });
			if (Array.isArray(arr) && includesUid(arr, uid)) found.push(key);
		}
		if (found.length === 0) return ["NON"];
		return found;
	} catch (e) {
		console.error("KV read error:", e);
		return ["NON"];
	}
}

function includesUid(arr, uid) {
	// Sentinel "0" means no user; filter it out
	for (const v of arr) {
		if (v === "0") continue;
		if (String(v) === uid) return true;
	}
	return false;
}

// JWT (HS256)
async function signJWT(payload, secret) {
	const header = { alg: "HS256", typ: "JWT" };
	const encHeader = base64url(JSON.stringify(header));
	const encPayload = base64url(JSON.stringify(payload));
	const toSign = `${encHeader}.${encPayload}`;
	const key = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"]
	);
		const sigBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(toSign));
		const signature = base64url(new Uint8Array(sigBuf));
	return `${encHeader}.${encPayload}.${signature}`;
}

// Utils
function base64url(str) {
	const bytes = typeof str === "string" ? new TextEncoder().encode(str) : str;
	let base64 = btoa(String.fromCharCode(...bytes));
	return base64.replace(/=+$/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function arrayBufferToString(buffer) {
	const bytes = new Uint8Array(buffer);
	let binary = "";
	for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
	return binary;
}

function randomState() {
	const bytes = new Uint8Array(16);
	crypto.getRandomValues(bytes);
	return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function parseCookies(cookieHeader) {
	const out = {};
	cookieHeader.split(/;\s*/).forEach((p) => {
		const idx = p.indexOf("=");
		if (idx > -1) out[decodeURIComponent(p.slice(0, idx))] = decodeURIComponent(p.slice(idx + 1));
	});
	return out;
}

function serializeCookie(name, value, opts = {}) {
	const segments = [`${encodeURIComponent(name)}=${encodeURIComponent(value)}`];
	if (opts.maxAge !== undefined) segments.push(`Max-Age=${Math.floor(opts.maxAge)}`);
	if (opts.domain) segments.push(`Domain=${opts.domain}`);
	if (opts.path) segments.push(`Path=${opts.path}`);
	if (opts.expires) segments.push(`Expires=${opts.expires.toUTCString()}`);
	if (opts.httpOnly) segments.push("HttpOnly");
	if (opts.secure) segments.push("Secure");
	if (opts.sameSite) segments.push(`SameSite=${opts.sameSite}`);
	return segments.join("; ");
}

function escapeHtml(s) {
	return String(s)
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}

