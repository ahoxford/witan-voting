import http from "k6/http";
import ws from "k6/ws";
import { check, sleep, fail } from "k6";
import { Counter, Rate, Trend } from "k6/metrics";
import { randomIntBetween } from "https://jslib.k6.io/k6-utils/1.4.0/index.js";

const BASE = __ENV.BASE_URL || "http://localhost:3000";
const VOTERS = parseInt(__ENV.VOTERS || "60", 10);

const voteErrors = new Rate("vote_errors");
const voteLatency = new Trend("vote_latency", true);
const joinLatency = new Trend("join_latency", true);
const wsConnected = new Counter("ws_connected");
const wsFailed = new Counter("ws_failed");
const liveUpdates = new Counter("ws_live_updates_received");

export const options = {
  scenarios: {
    // All 60 attendees arrive at once and vote — the realistic worst case
    thundering_herd: {
      executor: "per-vu-iterations",
      vus: VOTERS,
      iterations: 1,
      maxDuration: "2m",
      exec: "voterJourney",
    },
    // Big-screen displays also hold open sockets
    screens: {
      executor: "per-vu-iterations",
      vus: 2,
      iterations: 1,
      maxDuration: "2m",
      exec: "screenDisplay",
    },
  },
  thresholds: {
    vote_errors: ["rate<0.01"],
    vote_latency: ["p(95)<1000", "p(99)<2000"],
    join_latency: ["p(95)<1500"],
    http_req_failed: ["rate<0.01"],
  },
};

// --- setup: create a room and open voting -------------------------------

export function setup() {
  const createRes = http.post(
    `${BASE}/api/rooms`,
    JSON.stringify({
      title: `Load Test ${Date.now()}`,
      question: "Can this app handle 60 concurrent voters?",
      options: ["For", "Against", "Undecided"],
    }),
    { headers: { "Content-Type": "application/json" } }
  );

  if (createRes.status !== 200 && createRes.status !== 201) {
    fail(`Could not create test room (status ${createRes.status}): ${createRes.body}`);
  }

  const room = createRes.json();

  // WAITING -> PRE_VOTE so voting is open
  const phaseRes = http.post(`${BASE}/api/rooms/${room.id}/phase`, null);
  check(phaseRes, { "phase advanced to PRE_VOTE": (r) => r.status === 200 });

  console.log(`\n  Test room: ${room.id}`);
  console.log(`  Screen:    ${BASE}/screen/${room.id}`);
  console.log(`  Results:   ${BASE}/results/${room.id}\n`);

  return { roomId: room.id, optionIds: room.options.map((o) => o.id) };
}

// --- a single attendee --------------------------------------------------

export function voterJourney(data) {
  const sessionId = `loadtest-${__VU}-${Date.now()}-${randomIntBetween(1, 1e9)}`;
  const jsonHeaders = { headers: { "Content-Type": "application/json" } };

  // 1. Join the room (what the vote page does on mount)
  const joinRes = http.post(
    `${BASE}/api/rooms/${data.roomId}/join`,
    JSON.stringify({ sessionId }),
    jsonHeaders
  );
  joinLatency.add(joinRes.timings.duration);
  check(joinRes, {
    "join succeeded": (r) => r.status === 200,
    "join returned options": (r) => (r.json("room.options") || []).length > 0,
  });

  // 2. Hold a websocket open, like a real phone does, while voting over HTTP
  const wsUrl = `${BASE.replace(/^http/, "ws")}/socket.io/?EIO=4&transport=websocket`;

  ws.connect(wsUrl, {}, function (socket) {
    socket.on("open", () => {
      wsConnected.add(1);
      // engine.io handshake -> socket.io namespace connect
      socket.send("40");
    });

    socket.on("message", (msg) => {
      if (msg === "2") socket.send("3"); // ping -> pong
      if (msg.startsWith("40")) {
        socket.send(`42["join-room","${data.roomId}"]`);
      }
      if (msg.startsWith('42["results-update"')) {
        liveUpdates.add(1);
      }
    });

    socket.on("error", () => wsFailed.add(1));

    // 3. Cast a vote after a human-ish pause, then maybe change it
    socket.setTimeout(() => {
      castVote(data, sessionId, jsonHeaders);
    }, randomIntBetween(500, 3000));

    // Some people change their mind
    if (__VU % 3 === 0) {
      socket.setTimeout(() => {
        castVote(data, sessionId, jsonHeaders);
      }, randomIntBetween(5000, 9000));
    }

    // Stay connected like an attendee watching the screen
    socket.setTimeout(() => socket.close(), 20000);
  });
}

function castVote(data, sessionId, jsonHeaders) {
  const optionId = data.optionIds[randomIntBetween(0, data.optionIds.length - 1)];
  const res = http.post(
    `${BASE}/api/rooms/${data.roomId}/vote`,
    JSON.stringify({ sessionId, optionId }),
    jsonHeaders
  );
  voteLatency.add(res.timings.duration);
  const ok = check(res, {
    "vote accepted": (r) => r.status === 200,
    "vote returned results": (r) => Array.isArray(r.json("results")),
  });
  voteErrors.add(!ok);
}

// --- the projector / big screen ----------------------------------------

export function screenDisplay(data) {
  const res = http.get(`${BASE}/api/rooms/${data.roomId}/results`);
  check(res, { "screen loaded results": (r) => r.status === 200 });

  const wsUrl = `${BASE.replace(/^http/, "ws")}/socket.io/?EIO=4&transport=websocket`;

  ws.connect(wsUrl, {}, function (socket) {
    socket.on("open", () => {
      wsConnected.add(1);
      socket.send("40");
    });
    socket.on("message", (msg) => {
      if (msg === "2") socket.send("3");
      if (msg.startsWith("40")) socket.send(`42["join-screen","${data.roomId}"]`);
      if (msg.startsWith('42["results-update"')) liveUpdates.add(1);
    });
    socket.on("error", () => wsFailed.add(1));
    socket.setTimeout(() => socket.close(), 25000);
  });
}

// --- teardown: verify no votes were lost or double-counted -------------

export function teardown(data) {
  sleep(1);
  const res = http.get(`${BASE}/api/rooms/${data.roomId}/results`);
  if (res.status !== 200) {
    console.error("Could not fetch final results for verification");
    return;
  }
  const body = res.json();
  const pre = (body.allPhases || []).find((p) => p.phase === "PRE");
  const total = pre ? pre.results.reduce((s, r) => s + r.count, 0) : 0;

  console.log(`\n  ── Integrity check ──`);
  console.log(`  Voters simulated:   ${VOTERS}`);
  console.log(`  Votes recorded:     ${total}`);
  console.log(
    total === VOTERS
      ? `  ✓ Exactly one vote per participant — no loss, no double-counting.`
      : `  ✗ MISMATCH: expected ${VOTERS}, got ${total}. Investigate the vote upsert path.`
  );
  console.log(`  Results page: ${BASE}/results/${data.roomId}\n`);
}
