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
      title={isEdit ? 'Edit monitor' : 'New monitor'}
      description={isEdit ? undefined : 'The first check runs as soon as you save.'}
    >
      <MonitorForm
        // remount on type change from the outside, so defaults are fresh
        key={monitor?.id ?? initialType}
        monitor={monitor}
        initialType={initialType}
        onCancel={onClose}
        onSaved={(saved) => {
          toast.success(isEdit ? 'Changes saved' : `${saved.name} is being monitored`);
          onClose();
          if (!isEdit) onCreated?.(saved);
        }}
      />
    </Dialog>
  );
}
