export const typography = {
  // Font Family (SF Pro on iOS, system default)
  fontFamily: {
    regular: 'System',
    medium: 'System',
    semibold: 'System',
    bold: 'System',
  },

  // Type Scale
  fontSize: {
    displayLarge: 34,
    display: 24,
    headline: 20,
    title: 18,
    body: 16,
    callout: 14,
    caption: 12,
    small: 11,
  },

  // Font Weights
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },

  // Line Heights
  lineHeight: {
    display: 1.2,
    headline: 1.3,
    body: 1.5,
    caption: 1.4,
  },
};
