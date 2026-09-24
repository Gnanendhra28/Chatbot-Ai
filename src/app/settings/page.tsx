"use client";

import { useState } from "react";

import {
  BrainCircuit,
  Database,
  Moon,
  Save,
  Shield,
  Sun,
  Zap,
} from "lucide-react";

import { useSettings, AppSettings } from "@/lib/hooks/useSettings";

export default function SettingsPage() {
  const { settings, saveSettings, updateSetting } = useSettings();

  const [saving, setSaving] = useState(false);

  const toggleSetting = (key: keyof AppSettings) => {
    updateSetting(key, !settings[key] as never);
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      saveSettings(settings);

      setTimeout(() => {
        setSaving(false);
      }, 600);
    } catch (err) {
      console.error(err);

      setSaving(false);
    }
  };

  return (
    <div
      className="min-h-screen p-6 md:p-8"
      style={{
        background: "var(--background)",
      }}
    >
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <div
            className="w-2 h-2 rounded-full"
            style={{
              background: "var(--accent)",
              boxShadow: "0 0 10px var(--accent)",
            }}
          />

          <span
            className="text-xs uppercase tracking-[0.3em]"
            style={{
              color: "var(--accent)",
              fontFamily: "var(--font-mono)",
            }}
          >
            NeuralLog Config
          </span>
        </div>

        <h1
          className="text-4xl font-bold"
          style={{
            color: "var(--text-primary)",
            fontFamily: "var(--font-display)",
          }}
        >
          Settings
        </h1>

        <p
          className="mt-2 text-sm"
          style={{
            color: "var(--text-secondary)",
          }}
        >
          Configure your AI platform.
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* AI Settings */}
        <div
          className="rounded-2xl border p-6"
          style={{
            background: "var(--surface)",
            borderColor: "var(--border)",
          }}
        >
          <div className="flex items-center gap-3 mb-6">
            <BrainCircuit
              size={20}
              style={{
                color: "var(--accent)",
              }}
            />

            <h2
              className="text-xl font-semibold"
              style={{
                color: "var(--text-primary)",
              }}
            >
              AI Configuration
            </h2>
          </div>

          <div className="space-y-5">
            {/* Default Model */}
            <div>
              <label
                className="block mb-2 text-sm"
                style={{
                  color: "var(--text-secondary)",
                }}
              >
                Default Model
              </label>

              <select
                value={settings.defaultModel}
                onChange={(e) => updateSetting("defaultModel", e.target.value)}
                className="w-full p-3 rounded-xl border"
                style={{
                  background: "var(--surface-2)",
                  borderColor: "var(--border)",
                  color: "var(--text-primary)",
                }}
              >
                <option>llama-3.3-70b-versatile</option>

                <option>llama-3.1-8b-instant</option>

                <option>llama3-70b-8192</option>

                <option>gemma2-9b-it</option>
              </select>
            </div>

            {/* RAG */}
            <div className="flex items-center justify-between">
              <div>
                <h3
                  className="font-medium"
                  style={{
                    color: "var(--text-primary)",
                  }}
                >
                  Enable RAG
                </h3>

                <p
                  className="text-sm mt-1"
                  style={{
                    color: "var(--text-secondary)",
                  }}
                >
                  Retrieval-Augmented Generation
                </p>
              </div>

              <button
                onClick={() => toggleSetting("ragEnabled")}
                className={`w-14 h-8 rounded-full transition-all relative ${
                  settings.ragEnabled ? "bg-green-500" : "bg-gray-700"
                }`}
              >
                <div
                  className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${
                    settings.ragEnabled ? "left-7" : "left-1"
                  }`}
                />
              </button>
            </div>

            {/* Tokens */}
            <div className="flex items-center justify-between">
              <div>
                <h3
                  className="font-medium"
                  style={{
                    color: "var(--text-primary)",
                  }}
                >
                  Show Token Usage
                </h3>

                <p
                  className="text-sm mt-1"
                  style={{
                    color: "var(--text-secondary)",
                  }}
                >
                  Display token analytics
                </p>
              </div>

              <button
                onClick={() => toggleSetting("showTokens")}
                className={`w-14 h-8 rounded-full transition-all relative ${
                  settings.showTokens ? "bg-green-500" : "bg-gray-700"
                }`}
              >
                <div
                  className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${
                    settings.showTokens ? "left-7" : "left-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* System */}
        <div
          className="rounded-2xl border p-6"
          style={{
            background: "var(--surface)",
            borderColor: "var(--border)",
          }}
        >
          <div className="flex items-center gap-3 mb-6">
            <Database
              size={20}
              style={{
                color: "var(--accent)",
              }}
            />

            <h2
              className="text-xl font-semibold"
              style={{
                color: "var(--text-primary)",
              }}
            >
              System Settings
            </h2>
          </div>

          <div className="space-y-5">
            {/* Theme */}
            <div className="flex items-center justify-between">
              <div>
                <h3
                  className="font-medium"
                  style={{
                    color: "var(--text-primary)",
                  }}
                >
                  Theme
                </h3>

                <p
                  className="text-sm mt-1"
                  style={{
                    color: "var(--text-secondary)",
                  }}
                >
                  Interface appearance
                </p>
              </div>

              <button
                onClick={() =>
                  updateSetting(
                    "theme",
                    settings.theme === "dark" ? "light" : "dark",
                  )
                }
                className="p-3 rounded-xl"
                style={{
                  background: "var(--surface-2)",
                }}
              >
                {settings.theme === "dark" ? (
                  <Moon
                    size={18}
                    style={{
                      color: "var(--accent)",
                    }}
                  />
                ) : (
                  <Sun
                    size={18}
                    style={{
                      color: "var(--accent)",
                    }}
                  />
                )}
              </button>
            </div>

            {/* Auto Scroll */}
            <div className="flex items-center justify-between">
              <div>
                <h3
                  className="font-medium"
                  style={{
                    color: "var(--text-primary)",
                  }}
                >
                  Auto Scroll Chat
                </h3>

                <p
                  className="text-sm mt-1"
                  style={{
                    color: "var(--text-secondary)",
                  }}
                >
                  Automatically scroll messages
                </p>
              </div>

              <button
                onClick={() => toggleSetting("autoScroll")}
                className={`w-14 h-8 rounded-full transition-all relative ${
                  settings.autoScroll ? "bg-green-500" : "bg-gray-700"
                }`}
              >
                <div
                  className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${
                    settings.autoScroll ? "left-7" : "left-1"
                  }`}
                />
              </button>
            </div>

            {/* Status */}
            <div className="grid grid-cols-1 gap-3 pt-2">
              {[
                {
                  label: "MongoDB Connected",
                  icon: Database,
                },
                {
                  label: "Groq API Live",
                  icon: Zap,
                },
                {
                  label: "Authentication Active",
                  icon: Shield,
                },
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.label}
                    className="rounded-xl border p-4 flex items-center justify-between"
                    style={{
                      background: "var(--surface-2)",
                      borderColor: "var(--border)",
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        size={16}
                        style={{
                          color: "var(--accent)",
                        }}
                      />

                      <span
                        className="text-sm"
                        style={{
                          color: "var(--text-primary)",
                        }}
                      >
                        {item.label}
                      </span>
                    </div>

                    <div
                      className="w-2 h-2 rounded-full"
                      style={{
                        background: "#00ff94",
                        boxShadow: "0 0 10px #00ff94",
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="mt-8 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 rounded-xl font-medium flex items-center gap-2"
          style={{
            background: "var(--accent)",
            color: "#000",
          }}
        >
          <Save size={16} />

          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
