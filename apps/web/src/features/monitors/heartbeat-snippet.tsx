import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../components/ui/button';
import { Segmented } from '../../components/ui/segmented';
import { heartbeatUrl } from './presentation';

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
    <section className="space-y-5 rounded-card bg-mint p-6 text-on-color">
      <div>
        <h2 className="text-lg font-bold">Адрес для сигнала</h2>
        <p className="mt-0.5 text-sm opacity-70">
          Вызывайте его в конце задачи. Не пришёл вовремя — монитор перейдёт в «Не работает».
        </p>
      </div>

      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-2xl bg-white/60 px-4 py-3 font-mono text-[13px]">
          {url}
        </code>
        <Button variant="night" onClick={() => copy(url, 'url')}>
          {copied === 'url' ? <Check /> : <Copy />}
          {copied === 'url' ? 'Скопировано' : 'Копировать'}
        </Button>
      </div>

      <div className="space-y-3 rounded-3xl bg-night p-4 text-white">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Segmented
            size="sm"
            tone="dark"
            label="Пример"
            value={kind}
            onChange={setKind}
            options={[
              { value: 'cron', label: 'crontab' },
              { value: 'curl', label: 'curl' },
              { value: 'systemd', label: 'systemd' },
            ]}
          />
          <button
            type="button"
            onClick={() => copy(snippet, 'snippet')}
            className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-white/70 hover:bg-white/10 hover:text-white"
          >
            {copied === 'snippet' ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied === 'snippet' ? 'Скопировано' : 'Копировать'}
          </button>
        </div>
        <pre className="overflow-x-auto px-1 font-mono text-xs leading-relaxed text-lime">
          {snippet}
        </pre>
      </div>
    </section>
  );
}
