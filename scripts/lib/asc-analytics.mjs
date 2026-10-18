// Apple App Sessions Standard reports. Usage is opt-in, never a full audience count.
import { gunzipSync } from "node:zlib";

async function list(client, path) {
    const rows = [];
    const seen = new Set();
    while (path) {
        const url = new URL(path, "https://api.appstoreconnect.apple.com");
        if (url.origin !== "https://api.appstoreconnect.apple.com") throw new Error("Unexpected pagination origin");
        path = url.pathname + url.search;
        if (seen.has(path)) throw new Error("Repeated analytics pagination");
        seen.add(path);
        const page = await client.getJson(path);
        rows.push(...(page?.data ?? []));
        path = page?.links?.next;
    }
    return rows;
}

export async function ensureReportRequest(client, appId) {
    const requests = await list(client, `/v1/apps/${appId}/analyticsReportRequests?filter[accessType]=ONGOING`);
    const existing = requests.find(r => r.attributes?.accessType === "ONGOING" && !r.attributes?.stoppedDueToInactivity);
    if (existing) return existing.id;
    const created = await client.postJson("/v1/analyticsReportRequests", {
        data: {
            type: "analyticsReportRequests",
            attributes: { accessType: "ONGOING" },
            relationships: { app: { data: { type: "apps", id: appId } } },
        },
    });
    if (!created?.data?.id) throw new Error("Analytics request was not created");
    return created.data.id;
}

// TSV fields can be quoted and contain tabs, newlines, or escaped quotes.
function parseTsv(text) {
    const rows = []; let row = [], field = "", quoted = false;
    text = text.replace(/^\uFEFF/, "");
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (ch === '"') {
            if (quoted && text[i + 1] === '"') { field += '"'; i++; }
            else if (quoted || !field) quoted = !quoted;
            else field += ch;
        } else if (!quoted && (ch === "\t" || ch === "\n")) {
            row.push(field.replace(/\r$/, "")); field = "";
            if (ch === "\n") { rows.push(row); row = []; }
        } else field += ch;
    }
    if (quoted) throw new Error("Unterminated TSV field");
    if (field || row.length) { row.push(field.replace(/\r$/, "")); rows.push(row); }
    return rows.filter(r => r.some(Boolean));
}

export function parseSessionsTsv(text) {
    const [headers, ...rows] = parseTsv(text);
    if (!headers) throw new Error("Empty sessions segment");
    const columns = ["Date", "Sessions", "Unique Devices"].map(name => headers.indexOf(name));
    if (columns.includes(-1)) throw new Error("Missing App Sessions Standard columns");
    const [dateIndex, sessionIndex, deviceIndex] = columns;
    return rows.map(row => {
        const date = row[dateIndex];
        const counts = [row[sessionIndex], row[deviceIndex]];
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "") || counts.some(n => !/^\d+$/.test(n ?? "") || !Number.isSafeInteger(Number(n)))) {
            throw new Error("Invalid sessions date or count");
        }
        return { date, sessions: Number(counts[0]), deviceCountSum: Number(counts[1]) };
    });
}

async function readInstance(client, instance, fetchImpl) {
    const segments = await list(client, `/v1/analyticsReportInstances/${instance.id}/segments`);
    if (!segments.length) throw new Error("Sessions instance has no segments");
    const dates = new Map();
    for (const segment of segments) {
        const url = segment.attributes?.url;
        if (!url) throw new Error("Sessions segment has no download URL");
        const response = await fetchImpl(url);
        if (!response.ok) throw new Error(`Sessions download failed (${response.status})`);
        const body = gunzipSync(Buffer.from(await response.arrayBuffer())).toString("utf8");
        for (const row of parseSessionsTsv(body)) {
            const total = dates.get(row.date) ?? { date: row.date, sessions: 0, deviceCountSum: 0 };
            total.sessions += row.sessions;
            // Unique Devices is unique within each row, not necessarily across dimensions.
            total.deviceCountSum += row.deviceCountSum;
            dates.set(row.date, total);
        }
    }
    return dates;
}

export async function fetchAppUsage(client, appId, { fetchImpl = fetch, today = new Date().toISOString().slice(0, 10) } = {}) {
    const base = { source: "App Sessions Standard", optInOnly: true, daily: [], weekly: [], monthly: [] };
    try {
        const requestId = await ensureReportRequest(client, appId);
        const reports = await list(client, `/v1/analyticsReportRequests/${requestId}/reports?filter[category]=APP_USAGE`);
        const report = reports.find(r => r.attributes?.name === "App Sessions Standard");
        if (!report) {
            console.warn(`App usage for ${appId}: App Sessions Standard not generated yet`);
            return { ...base, status: "unavailable" };
        }
        const cutoff = new Date(Date.parse(today) - 35 * 86400000).toISOString().slice(0, 10);
        for (const granularity of ["DAILY", "WEEKLY", "MONTHLY"]) {
            const instances = (await list(client, `/v1/analyticsReports/${report.id}/instances?filter[granularity]=${granularity}`))
                .filter(i => i.attributes?.granularity === granularity)
                .sort((a, b) => a.attributes.processingDate.localeCompare(b.attributes.processingDate));
            const selected = granularity === "DAILY"
                ? instances.filter(i => i.attributes.processingDate >= cutoff)
                : instances.slice(-2);
            const dates = new Map();
            for (const instance of selected) {
                // Newer processing dates REPLACE an entire event-date partition.
                for (const [date, row] of await readInstance(client, instance, fetchImpl)) {
                    dates.set(date, { ...row, processingDate: instance.attributes.processingDate,
                        provisional: granularity === "DAILY" && Date.parse(instance.attributes.processingDate) - Date.parse(date) < 5 * 86400000 });
                }
            }
            base[granularity.toLowerCase()] = [...dates.values()].sort((a, b) => a.date.localeCompare(b.date));
        }
        return { ...base, status: [base.daily, base.weekly, base.monthly].some(rows => rows.length) ? "available" : "unavailable" };
    } catch (error) {
        // No signed download URLs or API response bodies in the public JSON.
        const status = error instanceof Error ? error.message.match(/(?:ASC API |failed \()(\d{3})/)?.[1] : null;
        console.warn(`App usage unavailable for ${appId}: ${status ? `HTTP ${status}` : "collection or report parsing failed"}`);
        return { source: base.source, optInOnly: true, status: "error", daily: [], weekly: [], monthly: [] };
    }
}
