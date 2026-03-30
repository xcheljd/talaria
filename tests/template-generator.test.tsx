/**
 * Tests for the Template Generator page and related components.
 *
 * Covers:
 * - templates.ts pure functions (template definitions, helpers)
 * - TemplateGeneratorPage component rendering and interaction
 * - TemplateSelector component
 * - TemplateFormFields component
 * - OutputPanel component
 */

import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { ProfileProvider } from '../src/contexts/ProfileProvider';

// ─── ResizeObserver mock for cmdk/shadcn Command component ──────────────────

beforeAll(() => {
  // cmdk (used by shadcn Command) uses ResizeObserver and scrollIntoView
  if (typeof globalThis.ResizeObserver === 'undefined') {
    globalThis.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof globalThis.ResizeObserver;
  }
  // Mock scrollIntoView for cmdk (jsdom doesn't implement it)
  if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = function () {};
  }
});

// ─── Test fixtures ────────────────────────────────────────────────────────────

const TEST_PROFILE = {
  employeeName: 'Jane Smith',
  jobTitle: 'Sales Associate',
  storeName: 'Citizen Company Store - Orlando',
  storeLocation: 'the Orlando Premium Outlets',
  storePhone: '407-555-1234',
  storeEmail: 'orlando@citizenwatchgroup.com',
  storeAddress: '4950 International Dr, Orlando, FL 32819',
  storeHours: 'Mon-Sat: 10AM-8PM, Sun: 11AM-7PM',
};

function setupProfile() {
  localStorage.setItem('userProfile', JSON.stringify(TEST_PROFILE));
}

// Helper to wrap component with required providers (including ProfileProvider)
function renderWithProviders(ui: React.ReactElement) {
  return render(ui, {
    wrapper: ({ children }) => (
      <ProfileProvider>
        <BrowserRouter>{children}</BrowserRouter>
      </ProfileProvider>
    ),
  });
}

// ─── templates.ts tests ─────────────────────────────────────────────────────

describe('templates.ts', () => {
  // Import the pure function module
  let templates: typeof import('../src/lib/templates');

  beforeEach(async () => {
    setupProfile();
    templates = await import('../src/lib/templates');
  });

  it('exports all 15 templates', () => {
    const keys = Object.keys(templates.templates);
    expect(keys).toHaveLength(15);
  });

  it('has all expected template keys', () => {
    const expected = [
      'new-customer-welcome',
      'back-in-stock',
      'thank-you-warranty',
      'new-model-arrival',
      'limited-edition',
      'vip-reconnection',
      'weekly-sale',
      'phone-confirmation',
      'phone-shipped',
      'phone-under-500',
      'phone-corporate',
      'inter-store-notification',
      'text-availability',
      'text-thank-you',
      'text-interest-followup',
    ];
    const keys = Object.keys(templates.templates);
    expected.forEach((key) => {
      expect(keys).toContain(key);
    });
  });

  it('each template has required properties', () => {
    Object.entries(templates.templates).forEach(([key, template]) => {
      expect(template.name).toBeTruthy();
      expect(template.category).toBeTruthy();
      expect(Array.isArray(template.fields)).toBe(true);
      expect(template.fields.length).toBeGreaterThan(0);
      expect(typeof template.generate).toBe('function');
    });
  });

  it('templates have correct categories', () => {
    const { templates: t } = templates;
    const emailTemplates = Object.entries(t).filter(
      ([, tmpl]) => tmpl.category === 'Customer Email'
    );
    const phoneTemplates = Object.entries(t).filter(
      ([, tmpl]) => tmpl.category === 'Phone Orders'
    );
    const textTemplates = Object.entries(t).filter(
      ([, tmpl]) => tmpl.category === 'Text'
    );

    expect(emailTemplates.length).toBeGreaterThanOrEqual(5);
    expect(phoneTemplates.length).toBeGreaterThanOrEqual(4);
    expect(textTemplates.length).toBeGreaterThanOrEqual(3);
  });

  it('new-customer-welcome generates correct output', () => {
    const result = templates.templates['new-customer-welcome'].generate({
      customerName: 'John',
      employeeName: 'Jane',
    });

    expect(result.body).toContain('John');
    expect(result.body).toContain('Subject:');
    expect(result.includeSignature).toBe(true);
  });

  it('text-availability generates correct output without signature', () => {
    const result = templates.templates['text-availability'].generate({
      customerName: 'John',
      modelName: 'Eco-Drive',
      price: '299',
      closingTime: '9 PM',
    });

    expect(result.body).toContain('John');
    expect(result.body).toContain('Eco-Drive');
    expect(result.body).toContain('299');
    expect(result.includeSignature).toBe(false);
  });

  it('text-interest-followup calculates sale price', () => {
    const result = templates.templates['text-interest-followup'].generate({
      customerName: 'John',
      employeeName: 'Jane',
      modelName: 'Eco-Drive Promaster',
      discount: '25',
      msrp: '400',
      endDate: 'Friday',
    });

    expect(result.body).toContain('300.00');
  });

  it('text-interest-followup throws on invalid MSRP', () => {
    expect(() =>
      templates.templates['text-interest-followup'].generate({
        customerName: 'John',
        employeeName: 'Jane',
        modelName: 'Test',
        discount: '25',
        msrp: 'abc',
        endDate: 'Friday',
      })
    ).toThrow('MSRP must be a valid positive number');
  });

  it('phone-under-500 throws when credit card not verified', () => {
    expect(() =>
      templates.templates['phone-under-500'].generate({
        managerNameOrStoreName: 'Manager',
        customerName: 'John',
        customerId: 'C123',
        employeeName: 'Jane',
        employeeId: 'E456',
        unitsQuantity: '1',
        totalAmount: '400',
        creditCardVerified: 'No',
        needsManagerVerification: 'No',
      })
    ).toThrow('Credit card must be verified');
  });

  it('phone-under-500 generates with verified card', () => {
    const result = templates.templates['phone-under-500'].generate({
      managerNameOrStoreName: 'Manager',
      customerName: 'John',
      customerId: 'C123',
      employeeName: 'Jane',
      employeeId: 'E456',
      unitsQuantity: '1',
      totalAmount: '400',
      creditCardVerified: 'Yes',
      needsManagerVerification: 'Yes',
    });

    expect(result.body).toContain('Ready for manager verification');
  });

  it('calculateSalePrice works correctly', () => {
    expect(templates.calculateSalePrice(400, 25)).toBe('300.00');
    expect(templates.calculateSalePrice(100, 50)).toBe('50.00');
    expect(templates.calculateSalePrice(299, 0)).toBe('299.00');
  });

  it('isHTMLContent detects HTML', () => {
    expect(templates.isHTMLContent('<p>Hello</p>')).toBe(true);
    expect(templates.isHTMLContent('<div>test</div>')).toBe(true);
    expect(templates.isHTMLContent('Plain text')).toBe(false);
    expect(templates.isHTMLContent(null)).toBe(false);
    expect(templates.isHTMLContent('')).toBe(false);
  });

  it('extractSubjectLine works correctly', () => {
    expect(
      templates.extractSubjectLine('Subject: Hello World\nBody text')
    ).toBe('Hello World');
    expect(templates.extractSubjectLine('No subject here')).toBe('');
  });

  it('getTemplateGroups returns grouped templates', () => {
    const groups = templates.getTemplateGroups();
    expect(groups.length).toBeGreaterThanOrEqual(3);
    groups.forEach((group) => {
      expect(group.category).toBeTruthy();
      expect(group.templates.length).toBeGreaterThan(0);
    });
  });

  it('searchTemplates filters correctly', () => {
    const all = templates.searchTemplates('');
    expect(all.length).toBe(15);

    const emailResults = templates.searchTemplates('email');
    expect(emailResults.length).toBeGreaterThan(0);

    const specific = templates.searchTemplates('Welcome');
    expect(specific.length).toBeGreaterThanOrEqual(1);
    expect(specific[0].key).toBe('new-customer-welcome');
  });

  it('getFieldSuggestions returns correct suggestions', () => {
    expect(templates.getFieldSuggestions('brand')).toEqual([
      'Citizen',
      'Bulova',
      'Frederique Constant',
    ]);
    expect(templates.getFieldSuggestions('customerName')).toEqual([]);
  });

  it('isYesNoField identifies yes/no fields', () => {
    expect(templates.isYesNoField('creditCardVerified')).toBe(true);
    expect(templates.isYesNoField('needsManagerVerification')).toBe(true);
    expect(templates.isYesNoField('customerName')).toBe(false);
  });

  it('isTextareaField identifies textarea fields', () => {
    expect(templates.isTextareaField('customerAddress')).toBe(true);
    expect(templates.isTextareaField('limitedDetails')).toBe(true);
    expect(templates.isTextareaField('customerName')).toBe(false);
  });

  it('formatFieldLabel converts camelCase to Title Case', () => {
    expect(templates.formatFieldLabel('customerName')).toBe('Customer Name');
    expect(templates.formatFieldLabel('modelName')).toBe('Model Name');
    expect(templates.formatFieldLabel('price')).toBe('Price');
  });

  it('fieldConfig has entries for all used fields', () => {
    const { fieldConfig: fc } = templates;
    Object.values(templates.templates).forEach((template) => {
      template.fields.forEach((field) => {
        // Every field used by a template should have a config entry
        expect(fc[field]).toBeDefined();
      });
    });
  });

  it('stripSignatureFromText removes signature blocks', () => {
    const text = `Hello there,

This is the body text.

Jane Smith │ Sales Associate
______________________________________________________________________`;

    const stripped = templates.stripSignatureFromText(text);
    expect(stripped).not.toContain('Jane Smith');
    expect(stripped).toContain('Hello there');
  });
});

// ─── TemplateGeneratorPage component tests ─────────────────────────────────

describe('TemplateGeneratorPage', () => {
  let TemplateGeneratorPage: typeof import('../src/pages/TemplateGeneratorPage').TemplateGeneratorPage;

  beforeEach(async () => {
    setupProfile();
    const mod = await import('../src/pages/TemplateGeneratorPage');
    TemplateGeneratorPage = mod.TemplateGeneratorPage;
  });

  it('renders the template selector', () => {
    renderWithProviders(<TemplateGeneratorPage />);
    expect(screen.getByText('Select Template')).toBeTruthy();
    expect(screen.getByRole('combobox', { name: /select a template/i })).toBeTruthy();
  });

  it('does not show form fields when no template is selected', () => {
    renderWithProviders(<TemplateGeneratorPage />);
    expect(screen.queryByText(/Fields$/)).toBeNull();
  });

  it('shows template form fields after selecting a template', async () => {
    const user = userEvent.setup();
    renderWithProviders(<TemplateGeneratorPage />);

    // Open the combobox
    const combobox = screen.getByRole('combobox');
    await user.click(combobox);

    // Search for a template
    await user.type(screen.getByPlaceholderText('Search templates...'), 'Welcome');

    // Select the template
    await waitFor(() => {
      const items = screen.getAllByText('New Customer Welcome');
      // Click the one inside the command list
      const listItem = items.find((el) => el.closest('[cmdk-item]') || el.closest('[data-slot="command-item"]'));
      if (listItem) {
        fireEvent.click(listItem);
      }
    });

    // Verify form fields appear
    await waitFor(() => {
      expect(screen.getByText('New Customer Welcome Fields')).toBeTruthy();
    });
  });
});

// ─── TemplateSelector component tests ──────────────────────────────────────

describe('TemplateSelector', () => {
  let TemplateSelector: typeof import('../src/components/TemplateSelector').TemplateSelector;

  beforeEach(async () => {
    setupProfile();
    const mod = await import('../src/components/TemplateSelector');
    TemplateSelector = mod.TemplateSelector;
  });

  it('renders with placeholder text', () => {
    renderWithProviders(
      <TemplateSelector value={null} onValueChange={() => {}} />
    );
    expect(screen.getByText('Select a template...')).toBeTruthy();
  });

  it('renders with selected template name', () => {
    renderWithProviders(
      <TemplateSelector
        value="new-customer-welcome"
        onValueChange={() => {}}
      />
    );
    expect(screen.getByText('New Customer Welcome')).toBeTruthy();
  });

  it('opens popover on click', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <TemplateSelector value={null} onValueChange={() => {}} />
    );

    await user.click(screen.getByRole('combobox'));

    // Wait for popover to render
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search templates...')).toBeTruthy();
    });
  });
});

// ─── TemplateFormFields component tests ────────────────────────────────────

describe('TemplateFormFields', () => {
  let TemplateFormFields: typeof import('../src/components/TemplateFormFields').TemplateFormFields;

  beforeEach(async () => {
    setupProfile();
    const mod = await import('../src/components/TemplateFormFields');
    TemplateFormFields = mod.TemplateFormFields;
  });

  it('renders form fields for new-customer-welcome template', () => {
    renderWithProviders(
      <TemplateFormFields
        templateKey="new-customer-welcome"
        onSubmit={() => {}}
        onClear={() => {}}
      />
    );

    // Use placeholder text matching since the label includes required asterisk
    expect(screen.getByPlaceholderText('John Smith')).toBeTruthy();
    expect(screen.getByPlaceholderText('Your name')).toBeTruthy();
  });

  it('renders Generate and Clear buttons', () => {
    renderWithProviders(
      <TemplateFormFields
        templateKey="new-customer-welcome"
        onSubmit={() => {}}
        onClear={() => {}}
      />
    );

    expect(screen.getByRole('button', { name: /generate/i })).toBeTruthy();
    // The form has a "Clear" reset button; clearable inputs also have "Clear field" buttons
    expect(
      screen.getAllByRole('button', { name: /clear/i }).length
    ).toBeGreaterThanOrEqual(1);
  });

  it('auto-fills employeeName from profile', () => {
    renderWithProviders(
      <TemplateFormFields
        templateKey="new-customer-welcome"
        onSubmit={() => {}}
        onClear={() => {}}
      />
    );

    // employeeName field should be auto-filled from profile
    const inputs = screen.getAllByPlaceholderText('Your name');
    const employeeInput = inputs.find(
      (el) => (el as HTMLInputElement).value === 'Jane Smith'
    ) as HTMLInputElement;
    expect(employeeInput).toBeTruthy();
    expect(employeeInput.value).toBe('Jane Smith');
  });

  it('renders radio buttons for yes/no fields', () => {
    renderWithProviders(
      <TemplateFormFields
        templateKey="phone-under-500"
        onSubmit={() => {}}
        onClear={() => {}}
      />
    );

    // Should have Yes/No radio options for creditCardVerified and needsManagerVerification
    const yesRadios = screen.getAllByRole('radio', { name: 'Yes' });
    const noRadios = screen.getAllByRole('radio', { name: 'No' });
    expect(yesRadios.length).toBeGreaterThanOrEqual(2);
    expect(noRadios.length).toBeGreaterThanOrEqual(2);
  });

  it('calls onSubmit with form data when Generate is clicked', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    renderWithProviders(
      <TemplateFormFields
        templateKey="new-customer-welcome"
        onSubmit={onSubmit}
        onClear={() => {}}
      />
    );

    const nameInput = screen.getByPlaceholderText('John Smith');
    await user.clear(nameInput);
    await user.type(nameInput, 'Test Customer');

    const generateBtn = screen.getByRole('button', { name: /generate/i });
    await user.click(generateBtn);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
      const callArgs = onSubmit.mock.calls[0][0];
      expect(callArgs.customerName).toBe('Test Customer');
    });
  });

  it('renders textarea for address fields', () => {
    renderWithProviders(
      <TemplateFormFields
        templateKey="phone-confirmation"
        onSubmit={() => {}}
        onClear={() => {}}
      />
    );

    // customerAddress should be a textarea
    const addressField = screen.getByPlaceholderText('123 Main St, City, State 12345');
    expect(addressField.tagName.toLowerCase()).toBe('textarea');
  });
});

// ─── OutputPanel component tests ───────────────────────────────────────────

describe('OutputPanel', () => {
  let OutputPanel: typeof import('../src/components/OutputPanel').OutputPanel;

  beforeEach(async () => {
    setupProfile();
    const mod = await import('../src/components/OutputPanel');
    OutputPanel = mod.OutputPanel;
  });

  it('renders nothing when no template key', () => {
    const { container } = renderWithProviders(
      <OutputPanel
        templateKey={null}
        templateResult={null}
        bodyContent={null}
        fullTextContent={null}
        subjectLine=""
        onSubjectChange={() => {}}
        onClear={() => {}}
      />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders Generated Message header', () => {
    renderWithProviders(
      <OutputPanel
        templateKey="new-customer-welcome"
        templateResult={null}
        bodyContent={null}
        fullTextContent={null}
        subjectLine=""
        onSubjectChange={() => {}}
        onClear={() => {}}
      />
    );
    expect(screen.getByText('Generated Message')).toBeTruthy();
  });

  it('renders Preview and Text tabs', () => {
    renderWithProviders(
      <OutputPanel
        templateKey="new-customer-welcome"
        templateResult={null}
        bodyContent={null}
        fullTextContent={null}
        subjectLine=""
        onSubjectChange={() => {}}
        onClear={() => {}}
      />
    );
    expect(screen.getByText('Preview')).toBeTruthy();
    expect(screen.getByText('Text')).toBeTruthy();
  });

  it('renders subject line input for enhanced templates', () => {
    renderWithProviders(
      <OutputPanel
        templateKey="new-customer-welcome"
        templateResult={null}
        bodyContent={null}
        fullTextContent={null}
        subjectLine="Welcome!"
        onSubjectChange={() => {}}
        onClear={() => {}}
      />
    );
    expect(screen.getByLabelText('Subject')).toBeTruthy();
    expect(screen.getByText('8')).toBeTruthy(); // character count badge
  });

  it('shows Copy button when content is present', () => {
    renderWithProviders(
      <OutputPanel
        templateKey="new-customer-welcome"
        templateResult={{ body: 'Test body', includeSignature: true }}
        bodyContent="Test body content"
        fullTextContent="Test body content\nSignature"
        subjectLine="Test"
        onSubjectChange={() => {}}
        onClear={() => {}}
      />
    );
    expect(screen.getByText('Copy Message')).toBeTruthy();
  });

  it('shows Download button for enhanced templates with content', () => {
    renderWithProviders(
      <OutputPanel
        templateKey="new-customer-welcome"
        templateResult={{ body: 'Test', includeSignature: true }}
        bodyContent="Test body"
        fullTextContent="Test body\nSig"
        subjectLine="Test"
        onSubjectChange={() => {}}
        onClear={() => {}}
      />
    );
    expect(screen.getByText('Download Email File')).toBeTruthy();
  });

  it('shows empty state when no body content', () => {
    renderWithProviders(
      <OutputPanel
        templateKey="new-customer-welcome"
        templateResult={null}
        bodyContent={null}
        fullTextContent={null}
        subjectLine=""
        onSubjectChange={() => {}}
        onClear={() => {}}
      />
    );
    expect(screen.getByText('No Preview Yet')).toBeTruthy();
  });

  it('shows text content in Text tab', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <OutputPanel
        templateKey="new-customer-welcome"
        templateResult={{ body: 'Test', includeSignature: true }}
        bodyContent="Test body content"
        fullTextContent="Test body content\nSignature block"
        subjectLine="Test"
        onSubjectChange={() => {}}
        onClear={() => {}}
      />
    );

    await user.click(screen.getByText('Text'));

    const textarea = screen.getByLabelText('Generated message output') as HTMLTextAreaElement;
    expect(textarea.value).toContain('Test body content');
  });
});

// ─── EmailPreview component tests ──────────────────────────────────────────

describe('EmailPreview', () => {
  let EmailPreview: typeof import('../src/components/EmailPreview').EmailPreview;

  beforeEach(async () => {
    setupProfile();
    const mod = await import('../src/components/EmailPreview');
    EmailPreview = mod.EmailPreview;
  });

  it('shows empty state when no content', () => {
    renderWithProviders(
      <EmailPreview bodyContent={null} includeSignature={true} />
    );
    expect(screen.getByText('No Preview Yet')).toBeTruthy();
  });

  it('renders body content as HTML', () => {
    const { container } = renderWithProviders(
      <EmailPreview
        bodyContent="Hello, this is a test message."
        includeSignature={true}
      />
    );

    expect(container.innerHTML).toContain('Hello, this is a test message.');
  });

  it('renders without signature when includeSignature is false', () => {
    const { container } = renderWithProviders(
      <EmailPreview
        bodyContent="Hello, text message."
        includeSignature={false}
      />
    );

    expect(container.innerHTML).toContain('Hello, text message.');
    // Should NOT contain signature separator
    expect(container.innerHTML).not.toContain('border-top: 1px solid');
  });

  it('renders with signature when includeSignature is true', () => {
    const { container } = renderWithProviders(
      <EmailPreview
        bodyContent="Hello, email message."
        includeSignature={true}
      />
    );

    expect(container.innerHTML).toContain('Hello, email message.');
    // Should contain signature separator
    expect(container.innerHTML).toContain('border-top: 1px solid');
  });
});

// ─── Integration test: Full template generation flow ───────────────────────

describe('Full template generation flow', () => {
  it('generates correct output for new-customer-welcome template', async () => {
    setupProfile();

    const mod = await import('../src/lib/templates');

    const result = mod.templates['new-customer-welcome'].generate({
      customerName: 'John Doe',
      employeeName: 'Jane Smith',
    });

    // Verify body contains expected content
    expect(result.body).toContain('John Doe');
    expect(result.body).toContain('Subject:');
    expect(result.body).toContain('Welcome to Citizen Company Store');

    // Extract and verify subject
    const subjectMatch = result.body.match(/^Subject:\s*(.+)/m);
    expect(subjectMatch).toBeTruthy();
    expect(subjectMatch![1]).toBe(
      'Welcome to Citizen Company Store - Your VIP Access'
    );

    // Verify signature inclusion
    expect(result.includeSignature).toBe(true);
  });

  it('generates correct output for all email templates', async () => {
    setupProfile();

    const mod = await import('../src/lib/templates');

    // Test data for each template
    const testInputs: Record<string, Record<string, string>> = {
      'new-customer-welcome': {
        customerName: 'John',
        employeeName: 'Jane',
      },
      'back-in-stock': {
        customerName: 'John',
        brand: 'Citizen',
        modelName: 'Eco-Drive',
        modelNumber: 'BN0150',
        price: '299',
        holdDeadline: 'Friday 5PM',
        employeeName: 'Jane',
      },
      'thank-you-warranty': {
        customerName: 'John',
        brand: 'Citizen',
        modelName: 'Eco-Drive',
        warrantyYears: '5',
        price: '299',
        employeeName: 'Jane',
      },
      'new-model-arrival': {
        customerName: 'John',
        brand: 'Citizen',
        modelName: 'Eco-Drive',
        modelNumber: 'BN0150',
        keyFeature1: 'Solar',
        keyFeature2: '200m WR',
        keyFeature3: '',
        price: '299',
        employeeName: 'Jane',
      },
      'limited-edition': {
        customerName: 'John',
        brand: 'Citizen',
        modelName: 'Promaster',
        modelNumber: 'BN0150',
        limitedDetails: '100 pieces',
        price: '599',
        quantityAvailable: '3',
        employeeName: 'Jane',
      },
      'vip-reconnection': {
        customerName: 'John',
        employeeName: 'Jane',
      },
      'weekly-sale': {
        customerName: 'John',
        collectionName: 'Eco-Drive',
        discount: '20',
        brand: 'Citizen',
        model1: 'Promaster',
        price1: '299',
        original1: '399',
        model2: '',
        price2: '',
        original2: '',
        endDate: 'Sunday',
        employeeName: 'Jane',
      },
      'phone-confirmation': {
        customerName: 'John',
        brand: 'Citizen',
        modelName: 'Eco-Drive',
        modelNumber: 'BN0150',
        price: '299',
        discount: '20',
        totalAmount: '319',
        customerAddress: '123 Main St',
        carrier: 'UPS',
        trackingNumber: '1Z999',
        employeeName: 'Jane',
      },
      'phone-shipped': {
        customerName: 'John',
        brand: 'Citizen',
        modelName: 'Eco-Drive',
        modelNumber: 'BN0150',
        trackingNumber: '1Z999',
        customerAddress: '123 Main St',
        carrier: 'UPS',
        employeeName: 'Jane',
      },
      'phone-under-500': {
        managerNameOrStoreName: 'Manager',
        customerName: 'John',
        customerId: 'C123',
        employeeName: 'Jane',
        employeeId: 'E456',
        unitsQuantity: '1',
        totalAmount: '400',
        creditCardVerified: 'Yes',
        needsManagerVerification: 'Yes',
      },
      'phone-corporate': {
        customerName: 'John',
        customerId: 'C123',
        employeeName: 'Jane',
        employeeId: 'E456',
        unitsQuantity: '2',
        totalAmount: '800',
        fulfillingStore: 'Vegas',
      },
      'inter-store-notification': {
        recipientStoreName: 'LA Store',
        customerName: 'John',
        trackingNumber: '1Z999',
      },
      'text-availability': {
        customerName: 'John',
        modelName: 'Eco-Drive',
        price: '299',
        closingTime: '9 PM',
      },
      'text-thank-you': {
        customerName: 'John',
        modelName: 'Eco-Drive',
        warrantyLength: '5-year',
        brand: 'Citizen',
      },
      'text-interest-followup': {
        customerName: 'John',
        employeeName: 'Jane',
        modelName: 'Eco-Drive',
        discount: '25',
        msrp: '400',
        endDate: 'Friday',
      },
    };

    // Verify each template can generate without errors
    for (const [key, data] of Object.entries(testInputs)) {
      const template = mod.templates[key];
      expect(template).toBeDefined();
      const result = template.generate(data);
      expect(result.body).toBeTruthy();
      expect(typeof result.body).toBe('string');
    }
  });
});
