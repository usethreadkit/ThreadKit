import type { Meta, StoryObj } from '@storybook/react-vite';
import { LatexRenderer } from './LatexRenderer';

const meta = {
  title: 'Renderers/LatexRenderer',
  component: LatexRenderer,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof LatexRenderer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const InlineSimple: Story = {
  args: {
    expression: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}',
    displayMode: false,
  },
};

export const DisplaySimple: Story = {
  args: {
    expression: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}',
    displayMode: true,
  },
};

export const InlineGreek: Story = {
  args: {
    expression: '\\alpha + \\beta = \\gamma',
    displayMode: false,
  },
};

export const DisplayIntegral: Story = {
  args: {
    expression: '\\int_{0}^{\\infty} e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}',
    displayMode: true,
  },
};

export const DisplaySummation: Story = {
  args: {
    expression: '\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}',
    displayMode: true,
  },
};

export const DisplayMatrix: Story = {
  args: {
    expression: '\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}',
    displayMode: true,
  },
};

export const DisplayFraction: Story = {
  args: {
    expression: '\\frac{\\partial f}{\\partial x} = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}',
    displayMode: true,
  },
};

export const InlineSubscriptSuperscript: Story = {
  args: {
    expression: 'x_1^2 + x_2^2 = r^2',
    displayMode: false,
  },
};

export const DisplayPythagorean: Story = {
  args: {
    expression: 'a^2 + b^2 = c^2',
    displayMode: true,
  },
};

export const DisplayEulerIdentity: Story = {
  args: {
    expression: 'e^{i\\pi} + 1 = 0',
    displayMode: true,
  },
};

export const DisplayLimitDefinition: Story = {
  args: {
    expression: '\\lim_{x \\to \\infty} \\left(1 + \\frac{1}{x}\\right)^x = e',
    displayMode: true,
  },
};

export const DisplayProduct: Story = {
  args: {
    expression: '\\prod_{i=1}^{n} x_i = x_1 \\cdot x_2 \\cdot \\ldots \\cdot x_n',
    displayMode: true,
  },
};

export const DisplayBinomial: Story = {
  args: {
    expression: '\\binom{n}{k} = \\frac{n!}{k!(n-k)!}',
    displayMode: true,
  },
};

export const InlineVector: Story = {
  args: {
    expression: '\\vec{v} = \\langle x, y, z \\rangle',
    displayMode: false,
  },
};

export const DisplayCases: Story = {
  args: {
    expression: 'f(x) = \\begin{cases} x^2 & \\text{if } x \\geq 0 \\\\ -x^2 & \\text{if } x < 0 \\end{cases}',
    displayMode: true,
  },
};

export const DisplayAligned: Story = {
  args: {
    expression: '\\begin{aligned} (x+y)^2 &= (x+y)(x+y) \\\\ &= x^2 + 2xy + y^2 \\end{aligned}',
    displayMode: true,
  },
};
