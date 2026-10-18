import { test } from "node:test";
import assert from "node:assert/strict";
import { gzipSync } from "node:zlib";
import { ensureReportRequest, fetchAppUsage, parseSessionsTsv } from "./asc-analytics.mjs";

const tsv = (...rows) => "Date\tApp Name\tSessions\tUnique Devices\r\n" + rows.map(r => r.join("\t")).join("\r\n");
const instance = (id, processingDate, granularity = "DAILY") => ({ id, attributes: { processingDate, granularity } });
function fixture({ instances = [instance("a", "2026-10-16")], bodies = { a: [tsv(["2026-10-15", "App", 8, 5])] } } = {}) {
    return {
        client: {
            getJson: async path => {
                if (path.includes("/analyticsReportRequests?")) return { data: [{ id: "req", attributes: { accessType: "ONGOING" } }] };
                if (path.includes("/reports?")) return { data: [{ id: "wrong", attributes: { name: "App Sessions Detailed" } }], links: { next: "https://api.appstoreconnect.apple.com/v1/reports-page2" } };
                if (path === "/v1/reports-page2") return { data: [{ id: "report", attributes: { name: "App Sessions Standard" } }] };
                if (path.includes("/instances?")) return { data: instances.filter(i => path.endsWith(i.attributes.granularity)) };
                const match = path.match(/analyticsReportInstances\/(.+)\/segments/);
                if (match) return { data: bodies[match[1]].map((_, n) => ({ attributes: { url: `https://example.test/${match[1]}/${n}` } })) };
                throw new Error(`Unexpected path ${path}`);
            },
        },
        fetchImpl: async url => {
            const [id, n] = new URL(url).pathname.slice(1).split("/");
            return new Response(gzipSync(bodies[id][Number(n)]));
        },
    };
}

test("parses Apple TSV with BOM, CRLF and quoted names containing tabs/newlines", () => {
    assert.deepEqual(parseSessionsTsv('\uFEFF' + tsv(["2026-10-15", '"My\tApp\nName"', 8, 5])),
        [{ date: "2026-10-15", sessions: 8, deviceCountSum: 5 }]);
});
test("rejects unexpected schemas and missing/invalid counts instead of inventing zero", () => {
    for (const body of ["", "Date,Active Devices\n2026-10-15,5", tsv(["2026-10-15", "App", "", 5]), tsv(["2026-10-15", "App", "NaN", 5])]) {
        assert.throws(() => parseSessionsTsv(body));
    }
});
test("reads standard report on next page, all segments, and replaces corrected date partitions", async () => {
    const { client, fetchImpl } = fixture({
        instances: [instance("b", "2026-10-16"), instance("a", "2026-10-15")],
        bodies: {
            a: [tsv(["2026-10-10", "App", 20, 8], ["2026-10-09", "App", 7, 5])],
            b: [tsv(["2026-10-10", "App", 10, 5]), tsv(["2026-10-10", "App", 12, 6], ["2026-10-15", "App", 6, 5])],
        },
    });
    const result = await fetchAppUsage(client, "111", { fetchImpl, today: "2026-10-17" });
    assert.equal(result.status, "available");
    assert.deepEqual(result.daily.map(r => [r.date, r.sessions, r.deviceCountSum, r.provisional]), [
        ["2026-10-09", 7, 5, false], ["2026-10-10", 22, 11, false], ["2026-10-15", 6, 5, true],
    ]);
});
test("weekly data can exist without daily data and is not converted to a daily average", async () => {
    const { client, fetchImpl } = fixture({ instances: [instance("a", "2026-10-16", "WEEKLY")] });
    const result = await fetchAppUsage(client, "111", { fetchImpl, today: "2026-10-17" });
    assert.equal(result.status, "available");
    assert.deepEqual(result.daily, []);
    assert.equal(result.weekly[0].sessions, 8);
    assert.equal(result.weekly[0].provisional, false);
});
test("creates an ongoing request; no generated report is unavailable, not zero", async () => {
    let posted;
    const client = { getJson: async () => ({ data: [] }), postJson: async (path, body) => { posted = body; return { data: { id: "new" } }; } };
    const result = await fetchAppUsage(client, "111");
    assert.equal(posted.data.attributes.accessType, "ONGOING");
    assert.equal(result.status, "unavailable");
    assert.deepEqual(result.daily, []);
});
test("replaces an inactive ongoing request", async () => {
    const client = { getJson: async () => ({ data: [{ id: "old", attributes: { accessType: "ONGOING", stoppedDueToInactivity: true } }] }), postJson: async () => ({ data: { id: "new" } }) };
    assert.equal(await ensureReportRequest(client, "111"), "new");
});
test("API errors remain distinct from missing reports and do not leak into public data", async () => {
    const client = { getJson: async () => { throw new Error("403 secret response"); } };
    const result = await fetchAppUsage(client, "111");
    assert.equal(result.status, "error");
    assert.ok(!JSON.stringify(result).includes("secret"));
});
test("one failed segment invalidates the collection instead of publishing partial totals", async () => {
    const { client } = fixture();
    for (const response of [new Response("bad gzip"), new Response("unavailable", { status: 403 })]) {
        const result = await fetchAppUsage(client, "111", { fetchImpl: async () => response, today: "2026-10-17" });
        assert.equal(result.status, "error");
        assert.deepEqual(result.daily, []);
    }
});
test("rejects pagination links outside Apple before authenticated requests", async () => {
    let calls = 0;
    const client = { getJson: async () => { calls++; return { data: [], links: { next: "https://other.test/v1" } }; } };
    assert.equal((await fetchAppUsage(client, "111")).status, "error");
    assert.equal(calls, 1);
});
