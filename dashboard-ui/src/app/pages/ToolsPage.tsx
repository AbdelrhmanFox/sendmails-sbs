import { useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Card } from '../components/design-system/Card';
import { Button } from '../components/design-system/Button';
import { Input } from '../components/design-system/Input';

export function ToolsPage() {
  const [url, setUrl] = useState('');
  const [generated, setGenerated] = useState('');
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  const generate = () => {
    const val = url.trim();
    if (!val) return;
    setGenerated(val);
  };

  const download = () => {
    const canvas = canvasRef.current?.querySelector('canvas');
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = 'qr-code.png';
    a.click();
  };

  const copyImage = async () => {
    const canvas = canvasRef.current?.querySelector('canvas');
    if (!canvas) return;
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // fallback: just download
        download();
      }
    });
  };

  return (
    <div className="space-y-6">
      <Card className="max-w-lg space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--brand-dim)]">QR Code Generator</p>
          <p className="mt-0.5 text-sm text-[var(--brand-muted)]">Enter any link and generate a scannable QR code.</p>
        </div>

        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              placeholder="https://..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && generate()}
            />
          </div>
          <Button type="button" onClick={generate} disabled={!url.trim()}>
            Generate
          </Button>
        </div>

        {generated && (
          <div className="flex flex-col items-center gap-4 rounded-[var(--brand-radius)] border border-[var(--brand-border)] bg-white p-6">
            <div ref={canvasRef}>
              <QRCodeCanvas
                value={generated}
                size={220}
                bgColor="#ffffff"
                fgColor="#0f172a"
                level="M"
                includeMargin={false}
              />
            </div>

            <p className="max-w-[220px] break-all text-center text-xs text-[var(--brand-muted)]">{generated}</p>

            <div className="flex gap-2">
              <Button type="button" size="sm" onClick={download}>
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Download PNG
              </Button>
              <Button type="button" size="sm" variant={copied ? 'primary' : 'secondary'} onClick={() => void copyImage()}>
                {copied ? 'Copied!' : 'Copy image'}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
