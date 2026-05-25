"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  BrainCircuit,
  Clock3,
  MessageSquare,
  AlertTriangle,
  Zap,
  Database,
  ArrowUpRight,
} from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip } from "recharts";

interface DashboardData {
  stats: {
    totalConversations: number;
    totalMessages: number;
    userMessages: number;
    assistantMessages: number;
    totalTokens: number;
    avgLatency: number;
  };

  activityData: {
    hour: string;
    count: number;
  }[];

  recentMessages: any[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await fetch("/api/dashboard");

        const json = await res.json();

        setData(json);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  const stats = [
    {
      title: "Total Messages",
      value: data?.stats?.totalMessages || 0,
      icon: Activity,
      color: "#00ff94",
    },

    {
      title: "Conversations",
      value: data?.stats?.totalConversations || 0,
      icon: MessageSquare,
      color: "#8b5cf6",
    },

    {
      title: "AI Responses",
      value: data?.stats?.assistantMessages || 0,
      icon: BrainCircuit,
      color: "#00ff94",
    },

    {
      title: "Token Usage",
      value: data?.stats?.totalTokens || 0,
      icon: BrainCircuit,
      color: "#f59e0b",
    },

    {
      title: "Avg Latency",
      value: `${data?.stats?.avgLatency || 0}ms`,
      icon: Clock3,
      color: "#06b6d4",
    },
  ];

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--background)" }}
      >
        <div
          className="text-sm tracking-widest uppercase animate-pulse"
          style={{
            color: "var(--accent)",
            fontFamily: "var(--font-mono)",
          }}
        >
          Loading Dashboard...
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen p-6 md:p-8"
      style={{ background: "var(--background)" }}
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
            NeuralLog Analytics
          </span>
        </div>

        <h1
          className="text-4xl font-bold"
          style={{
            color: "var(--text-primary)",
            fontFamily: "var(--font-display)",
          }}
        >
          Observability Dashboard
        </h1>

        <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
          Real-time monitoring for AI inference pipelines.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.title}
              className="rounded-2xl p-5 border relative overflow-hidden"
              style={{
                background: "var(--surface)",
                borderColor: "var(--border)",
              }}
            >
              <div
                className="absolute top-0 right-0 w-32 h-32 opacity-10"
                style={{
                  background:
                    "radial-gradient(circle, var(--accent) 0%, transparent 70%)",
                }}
              />

              <div className="flex items-start justify-between relative z-10">
                <div>
                  <p
                    className="text-sm mb-2"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {stat.title}
                  </p>

                  <h3
                    className="text-3xl font-bold"
                    style={{
                      color: "var(--text-primary)",
                      fontFamily: "var(--font-display)",
                    }}
                  >
                    {stat.value}
                  </h3>
                </div>

                <div
                  className="p-3 rounded-xl"
                  style={{
                    background: "rgba(0,255,148,0.08)",
                    border: "1px solid rgba(0,255,148,0.15)",
                  }}
                >
                  <Icon size={20} style={{ color: stat.color }} />
                </div>
              </div>

              <div className="flex items-center gap-2 mt-5 relative z-10">
                <ArrowUpRight size={14} style={{ color: "var(--accent)" }} />

                <span
                  className="text-sm font-medium"
                  style={{ color: "var(--accent)" }}
                >
                  Live MongoDB Data
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Performance + Activity */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Graph */}
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data?.activityData || []}>
              <defs>
                <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00ff94" stopOpacity={0.8} />

                  <stop offset="95%" stopColor="#00ff94" stopOpacity={0} />
                </linearGradient>
              </defs>

              <XAxis dataKey="hour" stroke="#666" />

              <Tooltip />

              <Area
                type="monotone"
                dataKey="count"
                stroke="#00ff94"
                fillOpacity={1}
                fill="url(#colorRequests)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* System Panel */}
        <div
          className="rounded-2xl border p-6"
          style={{
            background: "var(--surface)",
            borderColor: "var(--border)",
          }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2
                className="text-xl font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                System Status
              </h2>

              <p
                className="text-sm mt-1"
                style={{ color: "var(--text-secondary)" }}
              >
                Live infrastructure
              </p>
            </div>

            <Database size={18} style={{ color: "var(--accent)" }} />
          </div>

          <div className="space-y-4">
            {[
              "MongoDB Connected",
              "Groq API Active",
              "Authentication Online",
              "RAG Pipeline Ready",
            ].map((item) => (
              <div
                key={item}
                className="flex items-center justify-between rounded-xl p-4 border"
                style={{
                  background: "var(--surface-2)",
                  borderColor: "var(--border)",
                }}
              >
                <span
                  className="text-sm"
                  style={{ color: "var(--text-primary)" }}
                >
                  {item}
                </span>

                <div
                  className="w-2 h-2 rounded-full"
                  style={{
                    background: "#00ff94",
                    boxShadow: "0 0 10px #00ff94",
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Logs */}
      <div
        className="mt-6 rounded-2xl border p-6"
        style={{
          background: "var(--surface)",
          borderColor: "var(--border)",
        }}
      >
        <div className="mb-6">
          <h2
            className="text-xl font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            Recent Messages
          </h2>

          <p
            className="text-sm mt-1"
            style={{ color: "var(--text-secondary)" }}
          >
            Real chat activity from MongoDB
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                <th
                  className="text-left pb-4 text-sm"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Role
                </th>

                <th
                  className="text-left pb-4 text-sm"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Content
                </th>

                <th
                  className="text-left pb-4 text-sm"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Status
                </th>
              </tr>
            </thead>

            <tbody>
              {data?.recentMessages?.map((msg: any) => (
                <tr
                  key={msg._id}
                  className="border-b"
                  style={{
                    borderColor: "rgba(255,255,255,0.03)",
                  }}
                >
                  <td
                    className="py-4 text-sm capitalize"
                    style={{ color: "var(--accent)" }}
                  >
                    {msg.role}
                  </td>

                  <td
                    className="py-4 text-sm max-w-[500px] truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {msg.content}
                  </td>

                  <td className="py-4">
                    <span
                      className="px-2 py-1 rounded-full text-xs font-medium"
                      style={{
                        background: "rgba(0,255,148,0.1)",
                        color: "#00ff94",
                      }}
                    >
                      active
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
