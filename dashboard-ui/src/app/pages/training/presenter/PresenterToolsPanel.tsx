import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Card } from '../../../components/design-system/Card';
import { Button } from '../../../components/design-system/Button';
import { Input } from '../../../components/design-system/Input';

type Tab = 'qr' | 'script' | 'tele';

function normalizeUrlForQr(raw: string): string {
  const t = raw.trim();
  if (!t) return '';
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

export function PresenterToolsPanel() {
  const [tab, setTab] = useState<Tab>('qr');
  const [qrUrl, setQrUrl] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [qrMsg, setQrMsg] = useState('');

  const [scriptText, setScriptText] = useState('');
  const [scriptMsg, setScriptMsg] = useState('');
  const [scriptSpeed, setScriptSpeed] = useState(1);
  const [scriptVol, setScriptVol] = useState(1);
  const [scriptMuted, setScriptMuted] = useState(false);
  const [scriptVoice, setScriptVoice] = useState('');
  const scriptUtterRef = useRef<SpeechSynthesisUtterance | null>(null);
  const scriptIdxRef = useRef(0);
  const scriptWordsRef = useRef<string[]>([]);
  const [scriptPlaying, setScriptPlaying] = useState(false);

  const [teleText, setTeleText] = useState('');
  const teleScrollRef = useRef<HTMLDivElement | null>(null);
  const teleInnerRef = useRef<HTMLDivElement | null>(null);
  const [teleSpeed, setTeleSpeed] = useState(50);
  const [teleFont, setTeleFont] = useState(48);
  const [teleFg, setTeleFg] = useState('#ffffff');
  const [teleBg, setTeleBg] = useState('#000000');
  const [teleScrolling, setTeleScrolling] = useState(false);
  const teleRafRef = useRef<number | null>(null);

  const voices = useMemo(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return [];
    return window.speechSynthesis.getVoices().filter((v) => v.lang.startsWith('en') || v.default);
  }, []);

  useEffect(() => {
    const onVoices = () => {
      /* trigger re-render for voice list */
      setScriptVoice((v) => v || window.speechSynthesis?.getVoices().find((x) => x.lang.startsWith('en'))?.name || '');
    };
    window.speechSynthesis?.addEventListener('voiceschanged', onVoices);
    onVoices();
    return () => window.speechSynthesis?.removeEventListener('voiceschanged', onVoices);
  }, []);

  const scriptCounts = useMemo(() => {
    const chars = scriptText.length;
    const words = scriptText.trim() ? scriptText.trim().split(/\s+/).length : 0;
    return { chars, words };
  }, [scriptText]);

  const generateQr = async () => {
    setQrMsg('');
    const u = normalizeUrlForQr(qrUrl);
    if (!u) {
      setQrMsg('Enter a URL first.');
      return;
    }
    try {
      const dataUrl = await QRCode.toDataURL(u, { width: 300, margin: 2, color: { dark: '#0f172a', light: '#ffffff' } });
      setQrDataUrl(dataUrl);
      setQrMsg('QR ready. Download or show on screen.');
    } catch {
      setQrMsg('Could not generate QR.');
    }
  };

  const downloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = 'sbs-presenter-qr.png';
    a.click();
  };

  const stopScriptSpeech = useCallback(() => {
    window.speechSynthesis?.cancel();
    scriptUtterRef.current = null;
    setScriptPlaying(false);
  }, []);

  const speakNextChunk = useCallback(() => {
    const words = scriptWordsRef.current;
    if (!words.length) return;
    const synth = window.speechSynthesis;
    if (!synth) {
      setScriptMsg('Speech synthesis not available in this browser.');
      return;
    }
    const chunk = words.slice(scriptIdxRef.current, scriptIdxRef.current + 40).join(' ');
    if (!chunk.trim()) {
      setScriptPlaying(false);
      return;
    }
    const u = new SpeechSynthesisUtterance(chunk);
    u.rate = scriptSpeed;
    u.volume = scriptMuted ? 0 : scriptVol;
    if (scriptVoice) {
      const v = synth.getVoices().find((x) => x.name === scriptVoice);
      if (v) u.voice = v;
    }
    u.onend = () => {
      scriptIdxRef.current += 40;
      if (scriptIdxRef.current >= words.length) {
        setScriptPlaying(false);
        scriptIdxRef.current = 0;
      } else {
        speakNextChunk();
      }
    };
    scriptUtterRef.current = u;
    synth.speak(u);
  }, [scriptMuted, scriptSpeed, scriptVol, scriptVoice]);

  const scriptPlay = () => {
    setScriptMsg('');
    const words = scriptText.trim().split(/\s+/).filter(Boolean);
    if (!words.length) {
      setScriptMsg('Add script text first.');
      return;
    }
    window.speechSynthesis?.cancel();
    scriptWordsRef.current = words;
    if (scriptIdxRef.current >= words.length) scriptIdxRef.current = 0;
    setScriptPlaying(true);
    speakNextChunk();
  };

  const scriptPause = () => {
    window.speechSynthesis?.pause();
    setScriptPlaying(false);
  };

  const scriptResetPos = () => {
    scriptIdxRef.current = 0;
    stopScriptSpeech();
  };

  useEffect(() => {
    return () => stopScriptSpeech();
  }, [stopScriptSpeech]);

  useEffect(() => {
    if (!teleScrolling || !teleInnerRef.current || !teleScrollRef.current) return;
    const inner = teleInnerRef.current;
    const wrap = teleScrollRef.current;
    const step = () => {
      if (wrap.scrollHeight <= wrap.clientHeight) {
        teleRafRef.current = requestAnimationFrame(step);
        return;
      }
      wrap.scrollTop += teleSpeed / 200;
      if (wrap.scrollTop + wrap.clientHeight >= inner.scrollHeight - 2) {
        wrap.scrollTop = 0;
      }
      teleRafRef.current = requestAnimationFrame(step);
    };
    teleRafRef.current = requestAnimationFrame(step);
    return () => {
      if (teleRafRef.current != null) cancelAnimationFrame(teleRafRef.current);
    };
  }, [teleScrolling, teleSpeed]);

  const teleWordCount = teleText.trim() ? teleText.trim().split(/\s+/).length : 0;

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap gap-2 p-3" role="tablist" aria-label="Presenter tool">
        <Button type="button" size="sm" variant={tab === 'qr' ? 'primary' : 'secondary'} onClick={() => setTab('qr')}>
          QR code
        </Button>
        <Button type="button" size="sm" variant={tab === 'script' ? 'primary' : 'secondary'} onClick={() => setTab('script')}>
          Script reader
        </Button>
        <Button type="button" size="sm" variant={tab === 'tele' ? 'primary' : 'secondary'} onClick={() => setTab('tele')}>
          Teleprompter
        </Button>
      </Card>

      {tab === 'qr' ? (
        <Card className="space-y-3 p-4">
          <h3 className="text-base font-semibold text-[var(--brand-text)]">URL to encode</h3>
          <p className="text-sm text-[var(--brand-muted)]">
            Enter a full URL or a hostname; <code className="text-xs">https://</code> is added when missing.
          </p>
          <Input label="Link" value={qrUrl} onChange={(e) => setQrUrl(e.target.value)} placeholder="https://example.com/resource" />
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => void generateQr()}>
              Generate
            </Button>
            <Button type="button" variant="secondary" disabled={!qrDataUrl} onClick={downloadQr}>
              Download PNG
            </Button>
          </div>
          {qrMsg ? <p className="text-sm text-[var(--brand-muted)]">{qrMsg}</p> : null}
          {qrDataUrl ? (
            <div className="rounded border border-[var(--brand-border)] bg-white p-4 inline-block">
              <img src={qrDataUrl} width={300} height={300} alt="QR code preview" />
            </div>
          ) : null}
        </Card>
      ) : null}

      {tab === 'script' ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="space-y-3 p-4">
            <h3 className="text-base font-semibold text-[var(--brand-text)]">Script</h3>
            <div className="flex flex-wrap gap-2">
              <input
                type="file"
                accept=".txt,.md,text/plain"
                className="hidden"
                id="presenter-script-file"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const r = new FileReader();
                  r.onload = () => setScriptText(String(r.result || ''));
                  r.readAsText(f);
                  e.target.value = '';
                }}
              />
              <label
                htmlFor="presenter-script-file"
                className="inline-flex cursor-pointer items-center justify-center rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] bg-[var(--brand-surface-2)] px-4 py-2 text-sm font-medium text-[var(--brand-text)] hover:bg-[var(--brand-indigo)]"
              >
                Upload text file
              </label>
              <Button type="button" variant="secondary" onClick={() => setScriptText('')}>
                Clear
              </Button>
            </div>
            <label className="block text-sm font-medium text-[var(--brand-text)]">Content</label>
            <textarea
              className="min-h-[220px] w-full rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] bg-[var(--brand-surface)] p-3 text-sm text-[var(--brand-text)]"
              rows={12}
              maxLength={50000}
              value={scriptText}
              onChange={(e) => setScriptText(e.target.value)}
              placeholder="Paste or type your script. Plain text and Markdown (.md) files work best."
            />
            <p className="text-xs text-[var(--brand-muted)]">
              {scriptCounts.chars} characters · {scriptCounts.words} words
            </p>
          </Card>
          <Card className="space-y-3 p-4">
            <h3 className="text-base font-semibold text-[var(--brand-text)]">Playback</h3>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={scriptPlay} disabled={scriptPlaying}>
                Play
              </Button>
              <Button type="button" variant="secondary" onClick={scriptPause} disabled={!scriptPlaying}>
                Pause
              </Button>
              <Button type="button" variant="secondary" onClick={stopScriptSpeech}>
                Stop
              </Button>
              <Button type="button" variant="secondary" onClick={scriptResetPos}>
                Reset position
              </Button>
            </div>
            <label className="block text-sm text-[var(--brand-text)]">
              Speed {scriptSpeed.toFixed(1)}×
              <input type="range" min={0.5} max={2} step={0.1} value={scriptSpeed} onChange={(e) => setScriptSpeed(Number(e.target.value))} className="w-full" />
            </label>
            <label className="block text-sm text-[var(--brand-text)]">
              Volume {Math.round(scriptVol * 100)}%
              <input type="range" min={0} max={1} step={0.05} value={scriptVol} onChange={(e) => setScriptVol(Number(e.target.value))} className="w-full" />
            </label>
            <label className="flex items-center gap-2 text-sm text-[var(--brand-text)]">
              <input type="checkbox" checked={scriptMuted} onChange={(e) => setScriptMuted(e.target.checked)} /> Mute
            </label>
            <label className="block text-sm text-[var(--brand-text)]">Voice</label>
            <select
              className="w-full rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-2 text-sm text-[var(--brand-text)]"
              value={scriptVoice}
              onChange={(e) => setScriptVoice(e.target.value)}
            >
              {voices.length === 0 ? <option value="">Default browser voice</option> : null}
              {voices.map((v) => (
                <option key={v.name + v.lang} value={v.name}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
            {scriptMsg ? <p className="text-sm text-[var(--brand-danger)]">{scriptMsg}</p> : null}
            <p className="text-xs text-[var(--brand-muted)]">Uses your browser’s built-in speech. Availability varies by device and language packs.</p>
          </Card>
        </div>
      ) : null}

      {tab === 'tele' ? (
        <div className="space-y-4">
          <Card className="space-y-3 p-4">
            <h3 className="text-base font-semibold text-[var(--brand-text)]">Script</h3>
            <div className="flex flex-wrap gap-2">
              <input
                type="file"
                accept=".txt,.md,text/plain"
                className="hidden"
                id="presenter-tele-file"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const r = new FileReader();
                  r.onload = () => setTeleText(String(r.result || ''));
                  r.readAsText(f);
                  e.target.value = '';
                }}
              />
              <label htmlFor="presenter-tele-file">
                <span className="inline-flex cursor-pointer rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] bg-[var(--brand-surface-2)] px-3 py-2 text-sm text-[var(--brand-text)]">
                  Upload text file
                </span>
              </label>
              <Button type="button" variant="secondary" onClick={() => setTeleText('')}>
                Clear
              </Button>
            </div>
            <textarea
              className="min-h-[160px] w-full rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] bg-[var(--brand-surface)] p-3 text-sm text-[var(--brand-text)]"
              rows={8}
              maxLength={50000}
              value={teleText}
              onChange={(e) => setTeleText(e.target.value)}
              placeholder="Paste your lines here. Use Space in the prompter to play or pause when focused."
            />
            <p className="text-xs text-[var(--brand-muted)]">{teleWordCount} words</p>
          </Card>
          <Card className="space-y-3 p-4">
            <h3 className="text-base font-semibold text-[var(--brand-text)]">Controls</h3>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => setTeleScrolling((s) => !s)}>
                {teleScrolling ? 'Pause scroll' : 'Play'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setTeleScrolling(false)}>
                Stop
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  if (teleScrollRef.current) teleScrollRef.current.scrollTop = 0;
                }}
              >
                Reset scroll
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  const el = teleScrollRef.current;
                  if (!el) return;
                  if (document.fullscreenElement) void document.exitFullscreen();
                  else void el.requestFullscreen?.();
                }}
              >
                Fullscreen prompter
              </Button>
            </div>
            <label className="block text-sm text-[var(--brand-text)]">
              Scroll speed
              <input type="range" min={5} max={100} value={teleSpeed} onChange={(e) => setTeleSpeed(Number(e.target.value))} className="w-full" />
            </label>
            <label className="block text-sm text-[var(--brand-text)]">
              Text size
              <input type="range" min={24} max={96} value={teleFont} onChange={(e) => setTeleFont(Number(e.target.value))} className="w-full" />
            </label>
            <div className="flex flex-wrap gap-4">
              <label className="text-sm text-[var(--brand-text)]">
                Text <input type="color" value={teleFg} onChange={(e) => setTeleFg(e.target.value)} />
              </label>
              <label className="text-sm text-[var(--brand-text)]">
                Background <input type="color" value={teleBg} onChange={(e) => setTeleBg(e.target.value)} />
              </label>
            </div>
            <p className="text-xs text-[var(--brand-muted)]">Escape exits fullscreen. Space toggles scroll while the prompter is focused.</p>
          </Card>
          <Card className="p-2">
            <div
              ref={teleScrollRef}
              tabIndex={0}
              role="region"
              aria-label="Teleprompter text"
              className="max-h-[360px] overflow-hidden rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
              style={{ background: teleBg }}
              onKeyDown={(e) => {
                if (e.code === 'Space') {
                  e.preventDefault();
                  setTeleScrolling((s) => !s);
                }
              }}
            >
              <div
                ref={teleInnerRef}
                className="px-6 py-8 whitespace-pre-wrap"
                style={{ color: teleFg, fontSize: teleFont, lineHeight: 1.35 }}
              >
                {teleText || '…'}
              </div>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
