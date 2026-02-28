/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ALPHA_VANTAGE_API_KEY: string;
  readonly VITE_NEWS_API_KEY: string;
  readonly VITE_TWELVEDATA_API_KEY: string;
  readonly VITE_FINNHUB_API_KEY: string;
  readonly VITE_EMAILJS_SERVICE_ID: string;
  readonly VITE_EMAILJS_TEMPLATE_ID: string;
  readonly VITE_EMAILJS_PUBLIC_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
