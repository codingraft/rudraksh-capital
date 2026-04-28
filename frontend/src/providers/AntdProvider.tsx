'use client';

import React from 'react';
import { ConfigProvider, theme as antdTheme } from 'antd';
import { useThemeStore } from '@/store/themeStore';

const BRAND     = '#6366F1';
const BRAND_DARK = '#818CF8';

const lightTokens = {
  colorPrimary:          BRAND,
  colorInfo:             BRAND,
  colorSuccess:          '#10B981',
  colorWarning:          '#F59E0B',
  colorError:            '#EF4444',
  borderRadius:          10,
  borderRadiusLG:        14,
  fontFamily:            "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  colorBgContainer:      '#FFFFFF',
  colorBgLayout:         '#F4F6FB',
  colorBgElevated:       '#FFFFFF',
  colorText:             '#0F172A',
  colorTextSecondary:    '#64748B',
  colorBorder:           '#E2E8F0',
  colorBorderSecondary:  '#F1F5F9',
  boxShadow:             '0 2px 8px 0 rgba(0,0,0,0.07)',
  boxShadowSecondary:    '0 4px 16px 0 rgba(0,0,0,0.1)',
  controlHeight:         40,
  controlHeightLG:       48,
  fontSize:              14,
  fontSizeHeading3:      24,
  fontSizeHeading4:      20,
  fontWeightStrong:      700,
};

const darkTokens = {
  colorPrimary:          BRAND_DARK,
  colorInfo:             BRAND_DARK,
  colorSuccess:          '#34D399',
  colorWarning:          '#FBBF24',
  colorError:            '#F87171',
  borderRadius:          10,
  borderRadiusLG:        14,
  fontFamily:            "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  colorBgContainer:      '#1E293B',
  colorBgLayout:         '#0B0F1A',
  colorBgElevated:       '#1E293B',
  colorFillSecondary:    'rgba(255,255,255,0.04)',
  colorText:             '#F1F5F9',
  colorTextSecondary:    '#94A3B8',
  colorBorder:           'rgba(255,255,255,0.08)',
  colorBorderSecondary:  'rgba(255,255,255,0.04)',
  boxShadow:             '0 2px 8px 0 rgba(0,0,0,0.4)',
  boxShadowSecondary:    '0 4px 20px 0 rgba(0,0,0,0.5)',
  controlHeight:         40,
  controlHeightLG:       48,
  fontSize:              14,
  fontSizeHeading3:      24,
  fontWeightStrong:      700,
};

const commonComponents = {
  Menu: {
    itemBg:              'transparent',
    subMenuItemBg:       'transparent',
    itemMarginInline:    6,
    itemBorderRadius:    10,
    itemHeight:          44,
    iconSize:            16,
    fontSize:            14,
  },
  Card: {
    headerFontSize:      15,
    paddingLG:           20,
    borderRadiusLG:      16,
  },
  Table: {
    headerBg:            'transparent',
    borderColor:         'transparent',
    cellPaddingBlock:    12,
    cellPaddingInline:   16,
  },
  Button: {
    fontWeight:          600,
    paddingInlineLG:     24,
    borderRadiusLG:      10,
    controlHeightLG:     44,
  },
  Input: {
    activeShadow:        `0 0 0 3px rgba(99,102,241,0.15)`,
    borderRadiusLG:      10,
  },
  Select: {
    borderRadius:        10,
  },
  Modal: {
    borderRadiusLG:      16,
  },
  Tag: {
    borderRadius:        6,
    fontSizeSM:          11,
  },
  Badge: {
    borderRadiusSM:      8,
  },
  Divider: {
    marginLG:            16,
  },
};

export default function AntdProvider({ children }: { children: React.ReactNode }) {
  const mode  = useThemeStore((s) => s.mode);
  const isDark = mode === 'dark';

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: isDark ? darkTokens : lightTokens,
        components: {
          ...commonComponents,
          Menu: {
            ...commonComponents.Menu,
            itemSelectedBg:   isDark ? 'rgba(129,140,248,0.14)' : 'rgba(99,102,241,0.08)',
            itemSelectedColor: isDark ? BRAND_DARK : BRAND,
            itemHoverBg:       isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
            itemColor:         isDark ? '#94A3B8' : '#64748B',
          },
          Table: {
            ...commonComponents.Table,
            headerBg:    isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
            rowHoverBg:  isDark ? 'rgba(129,140,248,0.06)' : 'rgba(99,102,241,0.04)',
          },
          Card: {
            ...commonComponents.Card,
            colorBgContainer: isDark ? '#1E293B' : '#FFFFFF',
          },
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
}
