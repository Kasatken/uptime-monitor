import type { MonitorDto, MonitorType } from '@vigil/shared';
import { toast } from 'sonner';
import { Dialog } from '../../components/ui/dialog';
import { MonitorForm } from './monitor-form';

interface MonitorSheetProps {
  open: boolean;
  onClose: () => void;
  monitor?: MonitorDto;
  initialType?: MonitorType;
  onCreated?: (monitor: MonitorDto) => void;
}

export function MonitorSheet({
  open,
  onClose,
  monitor,
  initialType,
  onCreated,
}: MonitorSheetProps) {
  const isEdit = monitor !== undefined;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      variant="sheet"
      title={isEdit ? 'Настройки монитора' : 'Новый монитор'}
      description={isEdit ? undefined : 'Первая проверка запустится сразу после сохранения.'}
    >
      <MonitorForm
        key={monitor?.id ?? initialType}
        monitor={monitor}
        initialType={initialType}
        onCancel={onClose}
        onSaved={(saved) => {
          toast.success(isEdit ? 'Изменения сохранены' : `«${saved.name}» теперь под присмотром`);
          onClose();
          if (!isEdit) onCreated?.(saved);
        }}
      />
    </Dialog>
  );
}
