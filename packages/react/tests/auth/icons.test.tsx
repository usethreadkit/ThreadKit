import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import {
  EmailIcon,
  PhoneIcon,
  GoogleIcon,
  GitHubIcon,
  LoadingSpinner,
  BackArrowIcon,
  CloseIcon,
  AUTH_ICONS,
} from '../../src/auth/icons';

describe('Auth Icons', () => {
  it('renders EmailIcon', () => {
    const { container } = render(<EmailIcon className="test-class" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass('test-class');
    expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
  });

  it('renders PhoneIcon', () => {
    const { container } = render(<PhoneIcon className="test-class" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass('test-class');
  });

  it('renders GoogleIcon with colors', () => {
    const { container } = render(<GoogleIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();

    // Google icon should have multiple colored paths
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBeGreaterThan(1);

    // Check for Google's brand colors
    const colors = Array.from(paths).map(p => p.getAttribute('fill'));
    expect(colors).toContain('#4285F4'); // Blue
    expect(colors).toContain('#34A853'); // Green
    expect(colors).toContain('#FBBC05'); // Yellow
    expect(colors).toContain('#EA4335'); // Red
  });

  it('renders GitHubIcon', () => {
    const { container } = render(<GitHubIcon className="github" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass('github');
    expect(svg).toHaveAttribute('fill', 'currentColor');
  });

  it('renders LoadingSpinner with animation', () => {
    const { container } = render(<LoadingSpinner className="spinner" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass('spinner');

    // Should have an animation element
    const animate = container.querySelector('animateTransform');
    expect(animate).toBeInTheDocument();
    expect(animate).toHaveAttribute('attributeName', 'transform');
    expect(animate).toHaveAttribute('type', 'rotate');
  });

  it('renders BackArrowIcon', () => {
    const { container } = render(<BackArrowIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('stroke', 'currentColor');
    expect(svg).toHaveAttribute('stroke-width', '2');
  });

  it('renders CloseIcon', () => {
    const { container } = render(<CloseIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('stroke', 'currentColor');
  });

  describe('AUTH_ICONS mapping', () => {
    it('contains all expected icons', () => {
      expect(AUTH_ICONS).toHaveProperty('email');
      expect(AUTH_ICONS).toHaveProperty('phone');
      expect(AUTH_ICONS).toHaveProperty('google');
      expect(AUTH_ICONS).toHaveProperty('github');
      expect(AUTH_ICONS).toHaveProperty('anonymous');
    });

    it('maps to correct icon components', () => {
      expect(AUTH_ICONS.email).toBe(EmailIcon);
      expect(AUTH_ICONS.phone).toBe(PhoneIcon);
      expect(AUTH_ICONS.google).toBe(GoogleIcon);
      expect(AUTH_ICONS.github).toBe(GitHubIcon);
    });

    it('allows rendering icons from mapping', () => {
      const Icon = AUTH_ICONS.email;
      const { container } = render(<Icon className="mapped-icon" />);
      expect(container.querySelector('svg')).toHaveClass('mapped-icon');
    });
  });
});
