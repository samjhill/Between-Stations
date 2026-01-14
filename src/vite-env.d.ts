/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PROVIDER_MODE?: 'realtime' | 'hybrid' | 'timetable';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

