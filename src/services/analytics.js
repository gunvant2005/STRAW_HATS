/**
 * Analytics & User Tracking Service
 * Integrates Google Analytics 4 (GA4) with environment-driven measurement ID
 * and maintains a structured event log for user behavior tracking.
 */

import { config } from '../config.js';

let eventLog = [];
let analyticsInitialized = false;

/**
 * Initialize Google Analytics 4 with the measurement ID from environment config.
 * Dynamically injects the gtag.js script tag at runtime so the ID is never hardcoded
 * in HTML — changing VITE_GA_ID in .env is the only step needed.
 */
export function initAnalytics() {
  if (typeof window === 'undefined' || analyticsInitialized) return;

  const measurementId = config.gaMeasurementId;

  // Skip analytics initialization in development or when explicitly disabled
  if (!config.enableAnalytics) {
    analyticsInitialized = true;
    return;
  }

  // Dynamically inject the GA4 script tag
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  // Global window.gtag definition
  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  window.gtag = gtag;

  gtag('js', new Date());
  gtag('config', measurementId, { send_page_view: true });

  analyticsInitialized = true;
}

export function trackEvent(category, action, label = null, value = null) {
  const payload = {
    timestamp: new Date().toISOString(),
    category,
    action,
    label,
    value,
  };

  eventLog.unshift(payload);
  if (eventLog.length > 100) eventLog.pop();

  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
}

export function trackPageView(pageName) {
  trackEvent('Navigation', 'page_view', pageName);
}

export function getEventLog() {
  return [...eventLog];
}

