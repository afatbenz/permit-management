import type { FC } from 'react';
import clsx from 'clsx';
import { Spin } from 'antd';

type LoaderVariant = 'default' | 'overlay' | 'fullscreen' | 'minimal';
type LoaderBackground = 'light' | 'dark' | 'transparent' | 'blur';

interface LoaderProps {
  variant?: LoaderVariant;
  background?: LoaderBackground;
  text?: string;
}

const Loader: FC<LoaderProps> = ({ variant = 'default', background = 'light', text }) => {
  const containerClasses = clsx('z-50 flex items-center justify-center', {
    // Variant
    'fixed inset-0': variant === 'fullscreen',
    'absolute inset-0': variant === 'overlay',
    'h-screen w-full': variant === 'default',
    'p-2': variant === 'minimal',

    // Background
    'bg-background dark:bg-background': background === 'light',
    'bg-black/40': background === 'dark',
    'bg-transparent': background === 'transparent',
    'backdrop-blur-sm bg-background/40 dark:bg-black/30': background === 'blur',
  });

  const textClasses = clsx('mt-3 text-sm font-medium', {
    'text-muted-foreground': background !== 'dark',
    'text-primary-foreground': background === 'dark',
  });

  return (
    <div className={containerClasses} role="status" aria-live="polite">
      <div className="flex flex-col items-center justify-center gap-2">
        {/* Menggunakan Spinner bawaan Ant Design */}
        <Spin size="large" />
        
        {text && <span className={textClasses}>{text}</span>}
      </div>
    </div>
  );
};

export default Loader;