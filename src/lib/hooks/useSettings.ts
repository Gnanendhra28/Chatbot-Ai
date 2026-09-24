"use client";

import { useEffect, useState } from "react";

export interface AppSettings {
  ragEnabled: boolean;

  autoScroll: boolean;

  showTokens: boolean;

  theme: "dark" | "light";

  defaultModel: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  ragEnabled: true,

  autoScroll: true,

  showTokens: true,

  theme: "dark",

  defaultModel: "llama-3.3-70b-versatile",
};

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  // Load settings
  useEffect(() => {
    try {
      const saved = localStorage.getItem("neurallog-settings");

      if (saved) {
        const parsed = JSON.parse(saved);

        setSettings({
          ...DEFAULT_SETTINGS,
          ...parsed,
        });

        // Apply theme
        document.documentElement.setAttribute(
          "data-theme",
          parsed.theme || "dark",
        );
      }
    } catch (err) {
      console.error("Failed to load settings", err);
    }
  }, []);

  // Save settings
  const saveSettings = (newSettings: AppSettings) => {
    try {
      setSettings(newSettings);

      localStorage.setItem("neurallog-settings", JSON.stringify(newSettings));

      // Apply theme
      document.documentElement.setAttribute("data-theme", newSettings.theme);
    } catch (err) {
      console.error("Failed to save settings", err);
    }
  };

  // Update single setting
  const updateSetting = <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K],
  ) => {
    const updated = {
      ...settings,
      [key]: value,
    };

    saveSettings(updated);
  };

  return {
    settings,

    saveSettings,

    updateSetting,
  };
}
