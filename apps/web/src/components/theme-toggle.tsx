import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../lib/theme';
import { Button } from './ui/button';

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const label = theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему';
  return (
    <Button
      variant="secondary"
      size="iconSm"
      onClick={toggle}
      aria-label={label}
      title={label}
      className={className}
    >
      {theme === 'dark' ? <Sun /> : <Moon />}
    </Button>
  );
}
