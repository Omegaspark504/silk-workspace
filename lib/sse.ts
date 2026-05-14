type Ctrl = ReadableStreamDefaultController<Uint8Array>;

// Persist the map across Next.js hot-reloads in dev by attaching to global
declare global {
  // eslint-disable-next-line no-var
  var __sseClients: Map<string, Set<Ctrl>> | undefined;
}
if (!global.__sseClients) global.__sseClients = new Map();
const clients = global.__sseClients;

const enc = new TextEncoder();

export function addClient(userId: string, ctrl: Ctrl) {
  if (!clients.has(userId)) clients.set(userId, new Set());
  clients.get(userId)!.add(ctrl);
}

export function removeClient(userId: string, ctrl: Ctrl) {
  const set = clients.get(userId);
  if (!set) return;
  set.delete(ctrl);
  if (set.size === 0) clients.delete(userId);
}

export function notifyUser(userId: string, data: object) {
  const set = clients.get(userId);
  if (!set?.size) return;
  const chunk = enc.encode(`data: ${JSON.stringify(data)}\n\n`);
  for (const ctrl of [...set]) {
    try { ctrl.enqueue(chunk); }
    catch { set.delete(ctrl); }
  }
}

export function notifyUsers(userIds: string[], data: object) {
  for (const id of userIds) notifyUser(id, data);
}
