import { Response } from 'express';

type Client = {
  id: string;
  res: Response;
  userId?: number;
  role?: string;
};

class RealtimeHub {
  private clients: Map<string, Client> = new Map();

  addClient(id: string, res: Response, userId?: number, role?: string) {
    this.clients.set(id, { id, res, userId, role });
    res.write(`data: ${JSON.stringify({ event: 'connected', clientId: id, timestamp: new Date().toISOString() })}\n\n`);
  }

  removeClient(id: string) {
    this.clients.delete(id);
  }

  broadcast(eventType: string, payload: any) {
    const data = JSON.stringify({
      event: eventType,
      payload,
      timestamp: new Date().toISOString(),
    });

    for (const [id, client] of this.clients.entries()) {
      try {
        client.res.write(`data: ${data}\n\n`);
      } catch (err) {
        this.clients.delete(id);
      }
    }
  }

  getConnectionCount(): number {
    return this.clients.size;
  }
}

export const realtimeHub = new RealtimeHub();
