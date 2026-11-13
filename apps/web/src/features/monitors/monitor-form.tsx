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
import { Check, ChevronDown } from 'lucide-react';
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

// An empty number input would otherwise become NaN and fail validation of an optional field
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
  // errors of a union type can't be read as errors.config.url, hence `get`
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
          message: err instanceof Error ? err.message : 'Что-то пошло не так',
        });
      }
    }
  });

  const intervalOptions = (type === 'heartbeat' ? HEARTBEAT_PERIODS : INTERVAL_PRESETS).map(
    (value) => ({ value: value as number, label: formatInterval(value) }),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-6 overflow-y-auto px-6 pb-6">
        <fieldset disabled={isEdit}>
          <legend className="mb-2 text-[13px] font-semibold">Что проверяем</legend>
          <div className="grid gap-2.5 sm:grid-cols-3">
            {MONITOR_TYPES.map((value) => {
              const meta = TYPE_META[value];
              const checked = value === type;
              return (
                <label
                  key={value}
                  className={cn(
                    'relative flex cursor-pointer flex-col gap-2 rounded-3xl p-4 text-on-color transition',
                    'has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-fg',
                    meta.fill,
                    checked
                      ? 'ring-2 ring-fg ring-offset-2 ring-offset-surface'
                      : 'hover:brightness-95',
                    isEdit && !checked && 'hidden',
                    isEdit && 'cursor-default opacity-100 ring-0 sm:col-span-3',
                  )}
                >
                  <input
                    type="radio"
                    className="sr-only"
                    checked={checked}
                    onChange={() => changeType(value)}
                  />
                  <span className="flex items-center justify-between">
                    <span className="grid size-9 place-items-center rounded-full bg-white/55">
                      <meta.Icon className="size-[18px]" aria-hidden />
                    </span>
                    {checked && !isEdit && (
                      <span className="grid size-6 place-items-center rounded-full bg-night text-white">
                        <Check className="size-3.5" aria-hidden />
                      </span>
                    )}
                  </span>
                  <span className="text-sm font-bold">{meta.label}</span>
                  <span className="text-xs leading-snug opacity-75 max-sm:hidden">
                    {meta.description}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <Field label="Название" error={error('name')}>
          {(props) => (
            <Input
              {...props}
              {...register('name')}
              placeholder="Например, Интернет-магазин"
              autoFocus={!isEdit}
            />
          )}
        </Field>

        {type === 'http' && (
          <div className="grid grid-cols-[1fr_6.5rem] gap-3">
            <Field label="Адрес" error={error('config.url')}>
              {(props) => (
                <Input
                  {...props}
                  {...register('config.url' as Path<FormValues>)}
                  type="url"
                  inputMode="url"
                  placeholder="https://example.com/health"
                  className="font-mono text-[14px]"
                />
              )}
            </Field>
            <Field label="Метод">
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
            <Field label="Хост" error={error('config.host')}>
              {(props) => (
                <Input
                  {...props}
                  {...register('config.host' as Path<FormValues>)}
                  placeholder="vps.example.com"
                  className="font-mono text-[14px]"
                />
              )}
            </Field>
            <Field label="Порт" error={error('config.port')}>
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
          <span className="block text-[13px] font-semibold">
            {type === 'heartbeat' ? 'Задача должна присылать сигнал каждые' : 'Проверять каждые'}
          </span>
          <Controller
            control={control}
            name="intervalSeconds"
            render={({ field }) => (
              <Segmented
                label="Интервал"
                size="sm"
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
            label="Допустимая задержка, секунд"
            hint="Насколько сигнал может опоздать, прежде чем мы забьём тревогу."
            error={error('config.graceSeconds')}
          >
            {(props) => (
              <Input
                {...props}
                {...register('config.graceSeconds' as Path<FormValues>, { valueAsNumber: true })}
                type="number"
                min={0}
                className="w-36 tabular"
              />
            )}
          </Field>
        )}

        <details className="group rounded-3xl bg-surface-muted">
          <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-sm font-semibold select-none">
            Дополнительные настройки
            <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
          </summary>
          <div className="grid gap-4 px-5 pb-5 sm:grid-cols-2">
            <Field
              label="Тревога после"
              hint="Сколько неудачных проверок подряд"
              error={error('failureThreshold')}
            >
              {(props) => (
                <Input
                  {...props}
                  {...register('failureThreshold', { valueAsNumber: true })}
                  type="number"
                  min={1}
                  max={10}
                  className="bg-surface tabular"
                />
              )}
            </Field>

            {type !== 'heartbeat' && (
              <>
                <Field label="Таймаут, мс" error={error('config.timeoutMs')}>
                  {(props) => (
                    <Input
                      {...props}
                      {...register('config.timeoutMs' as Path<FormValues>, { valueAsNumber: true })}
                      type="number"
                      step={500}
                      className="bg-surface tabular"
                    />
                  )}
                </Field>
                <Field
                  label="Медленно, если дольше, мс"
                  hint="Необязательно"
                  error={error('config.degradedAfterMs')}
                >
                  {(props) => (
                    <Input
                      {...props}
                      {...register('config.degradedAfterMs' as Path<FormValues>, {
                        setValueAs: optionalNumber,
                      })}
                      type="number"
                      placeholder="1500"
                      className="bg-surface tabular"
                    />
                  )}
                </Field>
              </>
            )}

            {type === 'http' && (
              <>
                <Field
                  label="Ожидаемый код ответа"
                  hint="Например, 200-299, 301"
                  error={error('config.expectedStatus')}
                >
                  {(props) => (
                    <Input
                      {...props}
                      {...register('config.expectedStatus' as Path<FormValues>)}
                      className="bg-surface font-mono text-[14px]"
                    />
                  )}
                </Field>
                <Field
                  label="Страница должна содержать"
                  hint={method === 'HEAD' ? 'Недоступно для HEAD-запросов' : 'Необязательно'}
                  error={error('config.keyword')}
                >
                  {(props) => (
                    <Input
                      {...props}
                      {...register('config.keyword' as Path<FormValues>)}
                      disabled={method === 'HEAD'}
                      placeholder="В корзину"
                      className="bg-surface"
                    />
                  )}
                </Field>
              </>
            )}
          </div>
        </details>

        <div className="space-y-4 rounded-3xl bg-surface-muted p-5">
          <label className="flex cursor-pointer items-start justify-between gap-4">
            <span>
              <span className="block text-sm font-semibold">Показывать на странице статуса</span>
              <span className="mt-0.5 block text-xs text-fg-muted">
                Посетители увидят название, статус и аптайм. Адрес и ошибки — никогда.
              </span>
            </span>
            <input type="checkbox" {...register('isPublic')} className="peer sr-only" />
            <span
              aria-hidden
              className="relative mt-0.5 h-7 w-12 shrink-0 rounded-full bg-line-strong transition-colors peer-checked:bg-lime peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-fg after:absolute after:top-1 after:left-1 after:size-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5"
            />
          </label>
          {isPublic && (
            <Field
              label="Публичное название"
              hint="Необязательно. Показывается вместо внутреннего."
              error={error('publicName')}
            >
              {(props) => (
                <Input
                  {...props}
                  {...register('publicName')}
                  placeholder="Сайт"
                  className="bg-surface"
                />
              )}
            </Field>
          )}
        </div>

        {formState.errors.root && (
          <p
            role="alert"
            className="rounded-2xl bg-tomato px-4 py-3 text-sm font-medium text-on-color"
          >
            {formState.errors.root.message}
          </p>
        )}
      </div>

      <footer className="flex justify-end gap-2 border-t border-line px-6 py-4">
        <Button onClick={onCancel}>Отмена</Button>
        <Button type="submit" variant="primary" loading={formState.isSubmitting}>
          {isEdit ? 'Сохранить' : 'Создать монитор'}
        </Button>
      </footer>
    </form>
  );
}
