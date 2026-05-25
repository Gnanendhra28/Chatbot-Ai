import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db/mongoose";
import InferenceLog from "@/lib/db/models/InferenceLog";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  try {
    const { userId } = auth();

    if (!userId) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        { status: 401 },
      );
    }

    await connectDB();

    const { searchParams } = new URL(req.url);

    const range = searchParams.get("range") || "24h";

    const startDate = getRangeStart(range);

    // Base query
    const query = {
      userId,

      createdAt: {
        $gte: startDate,
      },
    };

    // Total requests
    const totalRequests = await InferenceLog.countDocuments(query);

    // Error requests
    const errorRequests = await InferenceLog.countDocuments({
      ...query,

      status: "error",
    });

    // Aggregated metrics
    const metrics = await InferenceLog.aggregate([
      {
        $match: query,
      },

      {
        $group: {
          _id: null,

          avgLatency: {
            $avg: "$latencyMs",
          },

          maxLatency: {
            $max: "$latencyMs",
          },

          totalTokens: {
            $sum: "$totalTokens",
          },

          avgTokens: {
            $avg: "$totalTokens",
          },

          avgPromptTokens: {
            $avg: "$promptTokens",
          },

          avgCompletionTokens: {
            $avg: "$completionTokens",
          },

          avgTokensPerSecond: {
            $avg: "$tokensPerSecond",
          },
        },
      },
    ]);

    // Activity graph
    const activityData = await InferenceLog.aggregate([
      {
        $match: query,
      },

      {
        $group: {
          _id: {
            $dateTrunc: {
              date: "$createdAt",

              unit: getBucketUnit(range),
            },
          },

          requests: {
            $sum: 1,
          },

          tokens: {
            $sum: "$totalTokens",
          },

          latency: {
            $avg: "$latencyMs",
          },
        },
      },

      {
        $sort: {
          _id: 1,
        },
      },
    ]);

    // Provider breakdown
    const providerStats = await InferenceLog.aggregate([
      {
        $match: query,
      },

      {
        $group: {
          _id: {
            provider: "$provider",

            model: "$model",
          },

          requests: {
            $sum: 1,
          },

          totalTokens: {
            $sum: "$totalTokens",
          },

          avgLatency: {
            $avg: "$latencyMs",
          },
        },
      },

      {
        $sort: {
          requests: -1,
        },
      },
    ]);

    // Recent logs
    const recentLogs = await InferenceLog.find(query)
      .sort({
        createdAt: -1,
      })
      .limit(20)
      .lean();

    // P95 latency
    const latencyLogs = await InferenceLog.find(query)
      .sort({
        latencyMs: 1,
      })
      .select("latencyMs")
      .lean();

    const p95Latency =
      latencyLogs.length > 0
        ? latencyLogs[Math.floor(latencyLogs.length * 0.95)]?.latencyMs || 0
        : 0;

    const data = metrics[0] || {};

    return NextResponse.json({
      success: true,

      range,

      overview: {
        totalRequests,

        errorRequests,

        successRate:
          totalRequests > 0
            ? (((totalRequests - errorRequests) / totalRequests) * 100).toFixed(
                2,
              )
            : 0,

        avgLatency: Math.round(data.avgLatency || 0),

        maxLatency: Math.round(data.maxLatency || 0),

        p95Latency,

        totalTokens: data.totalTokens || 0,

        avgTokens: Math.round(data.avgTokens || 0),

        avgPromptTokens: Math.round(data.avgPromptTokens || 0),

        avgCompletionTokens: Math.round(data.avgCompletionTokens || 0),

        avgTokensPerSecond: Math.round(data.avgTokensPerSecond || 0),
      },

      activityData: activityData.map((item) => ({
        timestamp: item._id,

        requests: item.requests,

        tokens: item.tokens,

        latency: Math.round(item.latency),
      })),

      providerStats: providerStats.map((item) => ({
        provider: item._id.provider,

        model: item._id.model,

        requests: item.requests,

        totalTokens: item.totalTokens,

        avgLatency: Math.round(item.avgLatency),
      })),

      recentLogs,
    });
  } catch (error) {
    console.error("Metrics API error:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch metrics",
      },
      { status: 500 },
    );
  }
}

function getRangeStart(range: string): Date {
  const now = new Date();

  switch (range) {
    case "1h":
      return new Date(now.getTime() - 60 * 60 * 1000);

    case "24h":
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);

    case "7d":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    case "30d":
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    default:
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }
}

function getBucketUnit(range: string): "minute" | "hour" | "day" {
  switch (range) {
    case "1h":
      return "minute";

    case "24h":
      return "hour";

    case "7d":
    case "30d":
      return "day";

    default:
      return "hour";
  }
}
