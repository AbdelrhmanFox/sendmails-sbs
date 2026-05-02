/**
 * Parse a Jitsi Meet URL into domain + room name for External API embed.
 * Supports https://meet.jit.si/RoomName and custom JITSI_MEET_BASE hosts.
 */
export function parseJitsiVoiceUrl(href: string): { domain: string; roomName: string } | null {
  const raw = String(href || '').trim();
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    const host = u.hostname.replace(/^www\./, '');
    if (!host) return null;
    let path = u.pathname.replace(/^\/+/, '');
    if (!path) return null;
    const roomName = decodeURIComponent(path.split('/')[0] || '').trim();
    if (!roomName) return null;
    return { domain: host, roomName };
  } catch {
    return null;
  }
}

export type JitsiApiInstance = {
  dispose: () => void;
  executeCommand?: (cmd: string, ...args: unknown[]) => void;
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
};

declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (domain: string, options: Record<string, unknown>) => JitsiApiInstance;
  }
}

export function loadJitsiScript(domain: string): Promise<void> {
  const id = 'jitsi-external-api-script';
  if (document.getElementById(id)) {
    if (window.JitsiMeetExternalAPI) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const el = document.getElementById(id) as HTMLScriptElement | null;
      if (!el) return reject(new Error('Jitsi script missing'));
      el.addEventListener('load', () => resolve());
      el.addEventListener('error', () => reject(new Error('Jitsi script failed')));
    });
  }
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.id = id;
    s.async = true;
    s.src = `https://${domain}/external_api.js`;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Could not load Jitsi API from ${domain}`));
    document.head.appendChild(s);
  });
}

/** Resolve a Vite asset URL to an absolute URL (Jitsi loads avatar from its origin). */
export function absoluteAssetUrl(href: string): string {
  try {
    return new URL(href, window.location.origin).href;
  } catch {
    return href;
  }
}

function attachLobbyMitigation(api: JitsiApiInstance): void {
  if (typeof api.on !== 'function') return;
  api.on('videoConferenceJoined', () => {
    try {
      api.executeCommand?.('toggleLobby', false);
    } catch {
      /* deployment may not expose command */
    }
  });
}

export function createJitsiEmbed(options: {
  domain: string;
  roomName: string;
  parentNode: HTMLElement;
  displayName: string;
  avatarURL?: string;
  height?: number | string;
}): JitsiApiInstance {
  const Api = window.JitsiMeetExternalAPI;
  if (!Api) throw new Error('JitsiMeetExternalAPI not available');

  const userInfo: Record<string, string> = {
    displayName: options.displayName,
  };
  if (options.avatarURL) userInfo.avatarURL = options.avatarURL;

  const api = new Api(options.domain, {
    roomName: options.roomName,
    parentNode: options.parentNode,
    width: '100%',
    height: options.height ?? 480,
    userInfo,
    configOverwrite: {
      prejoinConfig: {
        enabled: false,
      },
      startAudioOnly: true,
      startWithAudioMuted: false,
      startWithVideoMuted: true,
      disableDeepLinking: true,
    },
    interfaceConfigOverwrite: {
      SHOW_JITSI_WATERMARK: false,
      SHOW_WATERMARK_FOR_GUESTS: false,
      SHOW_BRAND_WATERMARK: false,
      SHOW_POWERED_BY: false,
      DEFAULT_BACKGROUND: '#0b1220',
      TOOLBAR_BUTTONS: ['microphone', 'hangup'],
    },
  });

  attachLobbyMitigation(api);
  return api;
}
