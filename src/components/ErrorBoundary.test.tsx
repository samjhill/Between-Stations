import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

// Component that throws an error
const ThrowError = ({ shouldThrow = false }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

// Suppress React error boundary warnings in tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('ErrorBoundary')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // Suppress console.error for these tests
    console.error = vi.fn();
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render children when there is no error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );
    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('should render error UI when error occurs', () => {
    // Suppress React's error logging for this test
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText(/We're sorry/)).toBeInTheDocument();
    
    errorSpy.mockRestore();
  });

  it('should show error details in development mode', () => {
    // Suppress React's error logging for this test
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Mock development mode
    const originalEnv = import.meta.env.DEV;
    Object.defineProperty(import.meta, 'env', {
      value: { ...import.meta.env, DEV: true },
      writable: true,
    });

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    
    const details = screen.queryByText(/Error Details/);
    expect(details).toBeInTheDocument();

    // Restore
    Object.defineProperty(import.meta, 'env', {
      value: { ...import.meta.env, DEV: originalEnv },
      writable: true,
    });
    
    errorSpy.mockRestore();
  });

  it('should have reset button', () => {
    // Suppress React's error logging for this test
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Try Again')).toBeInTheDocument();
    expect(screen.getByText('Refresh Page')).toBeInTheDocument();
    
    errorSpy.mockRestore();
  });

  it('should use custom fallback when provided', () => {
    // Suppress React's error logging for this test
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    const fallback = <div>Custom error message</div>;
    render(
      <ErrorBoundary fallback={fallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Custom error message')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    
    errorSpy.mockRestore();
  });
});
