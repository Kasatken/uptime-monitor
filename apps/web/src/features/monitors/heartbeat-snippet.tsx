import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../components/ui/button';
import { Card, CardHeader } from '../../components/ui/card';
import { Segmented } from '../../components/ui/segmented';
import { heartbeatUrl } from './presentation';

/** A cron schedule that matches the monitor's expected period. */
export function cronFor(intervalSeconds: number): string {
  const minutes = Math.round(intervalSeconds / 60);
  if (minutes < 60) return `*/${Math.max(minutes, 1)} * * * *`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours === 1 ? '0 * * * *' : `0 */${hours} * * *`;
  return '0 3 * * *';
}

const CURL = 'curl -fsS -m 10 --retry 3';

const SNIPPETS = {
  cron: (url: string, interval: number) =>
    `${cronFor(interval)}  /usr/local/bin/backup.sh && ${CURL} ${url} > /dev/null`,
  curl: (url: string) => `${CURL} ${url}`,
  systemd: (url: string) => `ExecStartPost=/usr/bin/${CURL} ${url}`,
} satisfies Record<string, (url: string, interval: number) => string>;

type SnippetKind = keyof typeof SNIPPETS;

export function HeartbeatSnippet({
  token,
  intervalSeconds,
}: {
  token: string;
  intervalSeconds: number;
}) {
  const url = heartbeatUrl(token);
  const [kind, setKind] = useState<SnippetKind>('cron');
  const [copied, setCopied] = useState<'url' | 'snippet' | null>(null);
  const snippet = SNIPPETS[kind](url, intervalSeconds);

  const copy = async (text: string, what: 'url' | 'snippet') => {
    await navigator.clipboard.writeText(text);
    setCopied(what);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <Card>
      <CardHeader
        title="Ping URL"
        description="Call this URL at the end of your job. No ping in time → the monitor goes down."
      />
      <div className="space-y-4 p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-lg border border-line bg-surface-muted px-3 py-2 font-mono text-[13px]">
            {url}
          </code>
          <Button onClick={() => copy(url, 'url')} aria-label="Copy ping URL">
            {copied === 'url' ? <Check className="text-up" /> : <Copy />}
            {copied === 'url' ? 'Copied' : 'Copy'}
          </Button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Segmented
              size="sm"
              label="Snippet"
              value={kind}
              onChange={setKind}
              options={[
                { value: 'cron', label: 'crontab' },
                { value: 'curl', label: 'curl' },
                { value: 'systemd', label: 'systemd' },
              ]}
            />
            <Button size="sm" variant="ghost" onClick={() => copy(snippet, 'snippet')}>
              {copied === 'snippet' ? <Check className="text-up" /> : <Copy />}
              {copied === 'snippet' ? 'Copied' : 'Copy snippet'}
            </Button>
          </div>
          <pre className="overflow-x-auto rounded-lg bg-fg p-3 font-mono text-xs leading-relaxed text-canvas">
            {snippet}
          </pre>
        </div>
      </div>
    </Card>
  );
}
