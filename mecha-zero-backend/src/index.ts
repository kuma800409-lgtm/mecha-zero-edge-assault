export { GameRoom } from './GameRoom';
export { Matchmaker } from './Matchmaker';

interface Env {
  GAME_ROOM: DurableObjectNamespace;
  MATCHMAKER: DurableObjectNamespace;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Upgrade, Connection',
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (url.pathname === '/') {
      return new Response(
        JSON.stringify({
          name: 'Mecha-Zero Edge Assault 3D',
          version: '1.0.0',
          status: 'online',
          endpoints: {
            matchmaker: '/matchmaker/websocket',
            room: '/room/:roomId/websocket',
            status: '/status',
          },
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    if (url.pathname === '/status') {
      const matchmakerId = env.MATCHMAKER.idFromName('global');
      const matchmaker = env.MATCHMAKER.get(matchmakerId);
      const response = await matchmaker.fetch(new Request('http://internal/status'));
      const data = await response.json();

      return new Response(JSON.stringify(data), {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    }

    if (url.pathname.startsWith('/matchmaker')) {
      const matchmakerId = env.MATCHMAKER.idFromName('global');
      const matchmaker = env.MATCHMAKER.get(matchmakerId);

      const subPath = url.pathname.replace('/matchmaker', '') || '/';
      const newUrl = new URL(request.url);
      newUrl.pathname = subPath;

      const newRequest = new Request(newUrl.toString(), {
        method: request.method,
        headers: request.headers,
        body: request.body,
      });

      const response = await matchmaker.fetch(newRequest);

      if (response.webSocket) {
        return response;
      }

      const newHeaders = new Headers(response.headers);
      Object.entries(corsHeaders).forEach(([key, value]) => {
        newHeaders.set(key, value);
      });

      return new Response(response.body, {
        status: response.status,
        headers: newHeaders,
      });
    }

    const roomMatch = url.pathname.match(/^\/room\/([^/]+)(\/.*)?$/);
    if (roomMatch) {
      const roomId = roomMatch[1];
      const subPath = roomMatch[2] || '/';

      const roomObjectId = env.GAME_ROOM.idFromName(roomId);
      const room = env.GAME_ROOM.get(roomObjectId);

      const newUrl = new URL(request.url);
      newUrl.pathname = subPath;

      const newRequest = new Request(newUrl.toString(), {
        method: request.method,
        headers: request.headers,
        body: request.body,
      });

      const response = await room.fetch(newRequest);

      if (response.webSocket) {
        return response;
      }

      const newHeaders = new Headers(response.headers);
      Object.entries(corsHeaders).forEach(([key, value]) => {
        newHeaders.set(key, value);
      });

      return new Response(response.body, {
        status: response.status,
        headers: newHeaders,
      });
    }

    return new Response('Not found', {
      status: 404,
      headers: corsHeaders,
    });
  },
};
