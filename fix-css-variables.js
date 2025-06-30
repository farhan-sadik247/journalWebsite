const fs = require('fs');
const path = require('path');

const cssFilePath = path.join(__dirname, 'src/app/dashboard/publication/Publication.module.scss');

// Read the file
let content = fs.readFileSync(cssFilePath, 'utf8');

// CSS variable mappings
const variableMappings = {
  'var(--color-text)': '#111827',
  'var(--color-text-secondary)': '#6b7280', 
  'var(--color-text-light)': '#9ca3af',
  'var(--color-bg-secondary)': '#f9fafb',
  'var(--color-bg-accent)': '#f3f4f6',
  'var(--color-bg-hover)': '#f3f4f6',
  'var(--color-border)': '#d1d5db',
  'var(--color-primary)': '#6366f1',
  'var(--color-success)': '#22c55e',
  'var(--color-warning)': '#f59e0b',
  'var(--color-danger)': '#ef4444'
};

// Replace all CSS variables
for (const [variable, value] of Object.entries(variableMappings)) {
  content = content.replace(new RegExp(variable.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
}

// Write back to file
fs.writeFileSync(cssFilePath, content);

console.log('CSS variables replaced successfully!');
