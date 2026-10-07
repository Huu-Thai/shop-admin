// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Badge } from './badge';
import { Button } from './button';
import { EmptyState } from './feedback';
import { Field } from './field';
import { Input } from './input';
import { Stat } from './stat';

describe('UI kit', () => {
  it('Button: type=button by default, loading disables and announces busy', () => {
    render(
      <>
        <Button>Save</Button>
        <Button loading>Saving</Button>
      </>,
    );
    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('type', 'button');
    const busy = screen.getByRole('button', { name: /Saving/ });
    expect(busy).toBeDisabled();
    expect(busy).toHaveAttribute('aria-busy', 'true');
  });

  it('Button asChild renders the link with button styles', () => {
    render(
      <Button asChild variant="secondary">
        <a href="/x">Go</a>
      </Button>,
    );
    const link = screen.getByRole('link', { name: 'Go' });
    expect(link).toHaveAttribute('href', '/x');
    expect(link.className).toContain('border-border-strong');
  });

  it('Field: the label targets the control and the error is announced', () => {
    render(
      <Field id="sku" label="SKU" required error="Already used">
        <Input id="sku" aria-invalid aria-describedby="sku-error" />
      </Field>,
    );
    const input = screen.getByLabelText(/SKU/);
    expect(input).toHaveAccessibleDescription('Already used');
    expect(screen.getByRole('alert')).toHaveTextContent('Already used');
  });

  it('Stat shows the change with a direction for screen readers', () => {
    render(<Stat label="Revenue" value="$10" change={-0.125} />);
    expect(screen.getByText('$10')).toBeInTheDocument();
    expect(screen.getByText('Down')).toHaveClass('sr-only');
    expect(screen.getByText(/12\.5%/)).toBeInTheDocument();
  });

  it('Badge tones and EmptyState', () => {
    render(
      <>
        <Badge tone="success" dot>
          Paid
        </Badge>
        <EmptyState title="No orders yet" description="They will appear here." />
      </>,
    );
    expect(screen.getByText('Paid').className).toContain('text-success-fg');
    expect(screen.getByText('No orders yet')).toBeInTheDocument();
  });
});
