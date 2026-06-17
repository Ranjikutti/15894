#!/usr/bin/env node

const API_URL =
  process.env.NOTIFICATION_API_URL ||
  "http://4.224.186.213/evaluation-service/notifications";
const AUTH_URL =
  process.env.NOTIFICATION_AUTH_URL ||
  "http://4.224.186.213/evaluation-service/auth";
const TOP_N = Number.parseInt(process.env.TOP_N || "10", 10);
const TYPE_WEIGHT = {
  Placement: 3,
  Result: 2,
  Event: 1,
};

function parseTimestamp(value) {
  const time = new Date(value.replace(" ", "T") + "Z").getTime();
  if (Number.isNaN(time)) {
    throw new Error(`Invalid timestamp: ${value}`);
  }
  return time;
}

function scoreNotification(notification) {
  const typeWeight = TYPE_WEIGHT[notification.Type] ?? 0;
  const recencyWeight = parseTimestamp(notification.Timestamp);
  return typeWeight * 1_000_000_000_000 + recencyWeight;
}

class MinHeap {
  constructor(compare) {
    this.items = [];
    this.compare = compare;
  }

  size() {
    return this.items.length;
  }

  peek() {
    return this.items[0];
  }

  push(value) {
    this.items.push(value);
    this.bubbleUp(this.items.length - 1);
  }

  pop() {
    if (this.items.length === 0) return undefined;
    const first = this.items[0];
    const last = this.items.pop();
    if (this.items.length > 0) {
      this.items[0] = last;
      this.bubbleDown(0);
    }
    return first;
  }

  bubbleUp(index) {
    let child = index;
    while (child > 0) {
      const parent = Math.floor((child - 1) / 2);
      if (this.compare(this.items[child], this.items[parent]) >= 0) break;
      [this.items[child], this.items[parent]] = [this.items[parent], this.items[child]];
      child = parent;
    }
  }

  bubbleDown(index) {
    let parent = index;
    while (true) {
      const left = parent * 2 + 1;
      const right = parent * 2 + 2;
      let smallest = parent;

      if (
        left < this.items.length &&
        this.compare(this.items[left], this.items[smallest]) < 0
      ) {
        smallest = left;
      }

      if (
        right < this.items.length &&
        this.compare(this.items[right], this.items[smallest]) < 0
      ) {
        smallest = right;
      }

      if (smallest === parent) break;
      [this.items[parent], this.items[smallest]] = [
        this.items[smallest],
        this.items[parent],
      ];
      parent = smallest;
    }
  }
}

class PriorityInbox {
  constructor(limit) {
    this.limit = limit;
    this.heap = new MinHeap((a, b) => {
      if (a.score !== b.score) return a.score - b.score;
      return a.notification.Timestamp.localeCompare(b.notification.Timestamp);
    });
  }

  offer(notification) {
    const entry = {
      notification,
      score: scoreNotification(notification),
    };

    if (this.heap.size() < this.limit) {
      this.heap.push(entry);
      return;
    }

    const weakest = this.heap.peek();
    if (this.isHigherPriority(entry, weakest)) {
      this.heap.pop();
      this.heap.push(entry);
    }
  }

  isHigherPriority(a, b) {
    if (a.score !== b.score) return a.score > b.score;
    return a.notification.Timestamp > b.notification.Timestamp;
  }

  top() {
    return [...this.heap.items]
      .sort((a, b) => {
        if (a.score !== b.score) return b.score - a.score;
        return b.notification.Timestamp.localeCompare(a.notification.Timestamp);
      })
      .map((entry) => ({
        id: entry.notification.ID,
        type: entry.notification.Type,
        message: entry.notification.Message,
        timestamp: entry.notification.Timestamp,
        score: entry.score,
      }));
  }
}

async function fetchNotifications() {
  const token = process.env.NOTIFICATION_API_TOKEN || (await getAccessToken());
  if (!token) {
    throw new Error(
      "Missing auth details. Export NOTIFICATION_API_TOKEN or the client credentials."
    );
  }

  const response = await fetch(API_URL, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`API request failed (${response.status}): ${body}`);
  }

  const payload = await response.json();
  return payload.notifications ?? [];
}

async function getAccessToken() {
  const credentials = {
    email: cleanEnv("AFFORDMED_EMAIL"),
    name: cleanEnv("AFFORDMED_NAME"),
    rollNo: cleanEnv("AFFORDMED_ROLL_NO"),
    accessCode: cleanEnv("AFFORDMED_ACCESS_CODE"),
    clientID: cleanEnv("AFFORDMED_CLIENT_ID"),
    clientSecret: cleanEnv("AFFORDMED_CLIENT_SECRET"),
  };

  const missing = Object.entries(credentials)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    return null;
  }

  const response = await fetch(AUTH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Auth request failed (${response.status}): ${body}`);
  }

  const payload = await response.json();
  return payload.access_token || payload.accessToken || payload.token;
}

function cleanEnv(name) {
  return process.env[name]?.trim();
}

async function main() {
  const notifications = await fetchNotifications();
  const inbox = new PriorityInbox(TOP_N);

  for (const notification of notifications) {
    inbox.offer(notification);
  }

  const top = inbox.top();

  console.log(`Priority Inbox: top ${Math.min(TOP_N, top.length)} notifications`);
  console.log("Ranking rule: Placement > Result > Event, then newer first");
  console.log("");
  top.forEach((item, index) => {
    console.log(
      `${index + 1}. [${item.type}] ${item.message} | ${item.timestamp} | score=${item.score}`
    );
  });
}

main().catch((error) => {
  console.error("Failed to build priority inbox:");
  console.error(error.message);
  process.exitCode = 1;
});
