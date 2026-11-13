import { zodResolver } from '@hookform/resolvers/zod';
import {
  type CreateMonitorFormValues,
  type CreateMonitorInput,
  createMonitorSchema,
  formatInterval,
  INTERVAL_PRESETS,
  MONITOR_TYPES,
  type MonitorDto,
  type MonitorType,
} from '@vigil/shared';
import { ChevronRight } from 'lucide-react';
import { Controller, get, type Path, useForm } from 'react-hook-form';
import { Button } from '../../components/ui/button';
import { Field, Input, Select } from '../../components/ui/field';
import { Segmented } from '../../components/ui/segmented';
import { ApiError } from '../../lib/api-client';
import { cn } from '../../lib/cn';
import { useCreateMonitor, useUpdateMonitor } from './monitors.api';
import { TYPE_META } from './presentation';

type FormValues = CreateMonitorFormValues;

const HEARTBEAT_PERIODS = [300, 3600, 21_600, 86_400] as const;

const DEFAULTS: { [K in MonitorType]: Extract<FormValues, { type: K }> } = {
  http: {
    type: 'http',
    name: '',
    intervalSeconds: 60,
    failureThreshold: 2,
    isPublic: false,
    publicName: '',
    config: { url: '', method: 'GET', expectedStatus: '200-299', timeoutMs: 10_000, keyword: '' },
  },
  tcp: {
    type: 'tcp',
    name: '',
    intervalSeconds: 60,
    failureThreshold: 2,
    isPublic: false,
    publicName: '',
    config: { host: '', port: 22, timeoutMs: 5_000 },
  },
  heartbeat: {
    type: 'heartbeat',
    name: '',
    intervalSeconds: 3600,
    // the grace period already absorbs late runs, no need to wait for a second miss
    failureThreshold: 1,
    isPublic: false,
    publicName: '',
    config: { graceSeconds: 300 },
  },
};

const toFormValues = (monitor: MonitorDto) =>
  ({
    type: monitor.type,
    name: monitor.name,
    intervalSeconds: monitor.intervalSeconds,
    failureThreshold: monitor.failureThreshold,
    isPublic: monitor.isPublic,
    publicName: monitor.publicName ?? '',
    config: monitor.config,
  }) as FormValues;

/** Empty input → undefined instead of NaN, so optional numbers stay optional. */
const optionalNumber = (value: unknown) =>
  value === '' || value === null || value === undefined ? undefined : Number(value);

interface MonitorFormProps {
  monitor?: MonitorDto;
  initialType?: MonitorType;
  onCancel: () => void;
  onSaved: (monitor: MonitorDto) => void;
}

export function MonitorForm({
  monitor,
  initialType = 'http',
  onCancel,
  onSaved,
}: MonitorFormProps) {
  const isEdit = monitor !== undefined;
  const form = useForm<FormValues, unknown, CreateMonitorInput>({
    resolver: zodResolver(createMonitorSchema),
    defaultValues: monitor ? toFormValues(monitor) : DEFAULTS[initialType],
    mode: 'onTouched',
  });
  const { register, control, watch, formState } = form;

  const create = useCreateMonitor();
  const update = useUpdateMonitor(monitor?.id ?? '');

  const type = watch('type');
  const isPublic = watch('isPublic');
  const method = watch('config.method' as Path<FormValues>);
  // `get` because errors of a union type can't be accessed as errors.config.url
  const error = (path: string) =>
    (get(formState.errors, path) as { message?: string } | undefined)?.message;

  const changeType = (next: MonitorType) => {
    const { name, isPublic, publicName } = form.getValues();
    form.reset({ ...DEFAULTS[next], name, isPublic, publicName });
  };

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const saved = isEdit
        ? await update.mutateAsync({
            name: values.name,
            intervalSeconds: values.intervalSeconds,
            failureThreshold: values.failureThreshold,
            isPublic: values.isPublic,
            publicName: values.publicName ?? null,
            config: values.config,
          })
        : await create.mutateAsync(values);
      onSaved(saved);
    } catch (err) {
      if (err instanceof ApiError && err.issues.length > 0) {
        for (const issue of err.issues) {
          form.setError(issue.path as Path<FormValues>, { message: issue.message });
        }
      } else {
        form.setError('root', {
          message: err instanceof Error ? err.message : 'Something went wrong',
        });
      }
    }
  });

  const intervalOptions = (type === 'heartbeat' ? HEARTBEAT_PERIODS : INTERVAL_PRESETS).map(
    (value) => ({ value: value as number, label: formatInterval(value) }),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
        <fieldset disabled={isEdit} className="space-y-2">
          <legend className="mb-2 text-[13px] font-medium">Type</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {MONITOR_TYPES.map((value) => {
              const meta = TYPE_META[value];
              const checked = value === type;
              return (
                <label
                  key={value}
                  className={cn(
                    'flex cursor-pointer flex-col gap-1.5 rounded-lg border p-3 transition-colors has-focus-visible:outline-2 has-focus-visible:outline-accent',
                    checked ? 'border-fg bg-surface-muted' : 'border-line hover:border-line-strong',
                    isEdit && !checked && 'hidden',
                    isEdit && 'cursor-default sm:col-span-3',
                  )}
                >
                  <input
                    type="radio"
                    className="sr-only"
                    checked={checked}
                    onChange={() => changeType(value)}
                  />
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <meta.Icon className="size-4 text-fg-muted" aria-hidden />
                    {meta.label}
                  </span>
                  <span className="text-xs leading-snug text-fg-muted">{meta.description}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <Field label="Name" error={error('name')}>
          {(props) => (
            <Input
              {...props}
              {...register('name')}
              placeholder="Shop frontend"
              autoFocus={!isEdit}
            />
          )}
        </Field>

        {type === 'http' && (
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <Field label="URL" error={error('config.url')}>
              {(props) => (
                <Input
                  {...props}
                  {...register('config.url' as Path<FormValues>)}
                  type="url"
                  inputMode="url"
                  placeholder="https://example.com/health"
                  className="font-mono text-[13px]"
                />
              )}
            </Field>
            <Field label="Method">
              {(props) => (
                <Select {...props} {...register('config.method' as Path<FormValues>)}>
                  <option>GET</option>
                  <option>HEAD</option>
                </Select>
              )}
            </Field>
          </div>
        )}

        {type === 'tcp' && (
          <div className="grid grid-cols-[1fr_7rem] gap-3">
            <Field label="Host" error={error('config.host')}>
              {(props) => (
                <Input
                  {...props}
                  {...register('config.host' as Path<FormValues>)}
                  placeholder="vps.example.com"
                  className="font-mono text-[13px]"
                />
              )}
            </Field>
            <Field label="Port" error={error('config.port')}>
              {(props) => (
                <Input
                  {...props}
                  {...register('config.port' as Path<FormValues>, { valueAsNumber: true })}
                  type="number"
                  min={1}
                  max={65535}
                  className="tabular"
                />
              )}
            </Field>
          </div>
        )}

        <div className="space-y-2">
          <span className="block text-[13px] font-medium">
            {type === 'heartbeat' ? 'Expected to ping every' : 'Check every'}
          </span>
          <Controller
            control={control}
            name="intervalSeconds"
            render={({ field }) => (
              <Segmented
                label="Interval"
                value={field.value}
                onChange={field.onChange}
                options={
                  intervalOptions.some((o) => o.value === field.value)
                    ? intervalOptions
                    : [
                        ...intervalOptions,
                        { value: field.value, label: formatInterval(field.value) },
                      ]
                }
              />
            )}
          />
        </div>

        {type === 'heartbeat' && (
          <Field
            label="Grace period (seconds)"
            hint="How late a ping may be before we call it missed."
            error={error('config.graceSeconds')}
          >
            {(props) => (
              <Input
                {...props}
                {...register('config.graceSeconds' as Path<FormValues>, { valueAsNumber: true })}
                type="number"
                min={0}
                className="w-32 tabular"
              />
            )}
          </Field>
        )}

        <details className="group rounded-lg border border-line">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-[13px] font-medium select-none">
            <ChevronRight className="size-4 text-fg-muted transition-transform group-open:rotate-90" />
            Advanced settings
          </summary>
          <div className="grid gap-4 border-t border-line p-3 sm:grid-cols-2">
            <Field
              label="Confirm after"
              hint="Failed checks in a row before alerting"
              error={error('failureThreshold')}
            >
              {(props) => (
                <Input
                  {...props}
                  {...register('failureThreshold', { valueAsNumber: true })}
                  type="number"
                  min={1}
                  max={10}
                  className="tabular"
                />
              )}
            </Field>

            {type !== 'heartbeat' && (
              <>
                <Field label="Timeout (ms)" error={error('config.timeoutMs')}>
                  {(props) => (
                    <Input
                      {...props}
                      {...register('config.timeoutMs' as Path<FormValues>, { valueAsNumber: true })}
                      type="number"
                      step={500}
                      className="tabular"
                    />
                  )}
                </Field>
                <Field
                  label="Degraded above (ms)"
                  hint="Optional. Slower responses show as degraded."
                  error={error('config.degradedAfterMs')}
                >
                  {(props) => (
                    <Input
                      {...props}
                      {...register('config.degradedAfterMs' as Path<FormValues>, {
                        setValueAs: optionalNumber,
                      })}
                      type="number"
                      placeholder="e.g. 1500"
                      className="tabular"
                    />
                  )}
                </Field>
              </>
            )}

            {type === 'http' && (
              <>
                <Field
                  label="Expected status"
                  hint="Codes or ranges: 200-299, 301"
                  error={error('config.expectedStatus')}
                >
                  {(props) => (
                    <Input
                      {...props}
                      {...register('config.expectedStatus' as Path<FormValues>)}
                      className="font-mono text-[13px]"
                    />
                  )}
                </Field>
                <Field
                  label="Must contain"
                  hint={
                    method === 'HEAD'
                      ? 'Not available for HEAD requests'
                      : 'Optional text the page must include'
                  }
                  error={error('config.keyword')}
                >
                  {(props) => (
                    <Input
                      {...props}
                      {...register('config.keyword' as Path<FormValues>)}
                      disabled={method === 'HEAD'}
                      placeholder="Add to cart"
                    />
                  )}
                </Field>
              </>
            )}
          </div>
        </details>

        <div className="space-y-3 rounded-lg border border-line p-3">
          <label className="flex cursor-pointer items-start justify-between gap-4">
            <span>
              <span className="block text-[13px] font-medium">Show on public status page</span>
              <span className="block text-xs text-fg-muted">
                Visitors see the name, status and uptime – never the URL or errors.
              </span>
            </span>
            <input type="checkbox" {...register('isPublic')} className="peer sr-only" />
            <span
              aria-hidden
              className="relative mt-0.5 h-5 w-9 shrink-0 rounded-full bg-line-strong transition-colors peer-checked:bg-up peer-focus-visible:outline-2 peer-focus-visible:outline-accent after:absolute after:top-0.5 after:left-0.5 after:size-4 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-4"
            />
          </label>
          {isPublic && (
            <Field
              label="Public name"
              hint="Optional. Shown instead of the internal name."
              error={error('publicName')}
            >
              {(props) => <Input {...props} {...register('publicName')} placeholder="Website" />}
            </Field>
          )}
        </div>

        {formState.errors.root && (
          <p role="alert" className="rounded-lg bg-down/10 px-3 py-2 text-sm text-down">
            {formState.errors.root.message}
          </p>
        )}
      </div>

      <footer className="flex justify-end gap-2 border-t border-line px-5 py-4">
        <Button onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="primary" loading={formState.isSubmitting}>
          {isEdit ? 'Save changes' : 'Create monitor'}
        </Button>
      </footer>
    </form>
  );
}
