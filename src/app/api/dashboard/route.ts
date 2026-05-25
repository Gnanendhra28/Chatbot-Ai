import { NextResponse } from "next/server";

import { connectDB } from "@/lib/db/mongoose";

import Conversation from "@/lib/db/models/Conversation";
import Message from "@/lib/db/models/Message";
import InferenceLog from "@/lib/db/models/InferenceLog";

export async function GET() {
  try {
    await connectDB();

    // ====================================
    // Basic Counts
    // ====================================

    const totalConversations = await Conversation.countDocuments();

    const totalMessages = await Message.countDocuments();

    const userMessages = await Message.countDocuments({
      role: "user",
    });

    const assistantMessages = await Message.countDocuments({
      role: "assistant",
    });

    // ====================================
    // Recent Messages
    // ====================================

    const recentMessages = await Message.find()
      .sort({
        createdAt: -1,
      })
      .limit(10)
      .lean();

    // ====================================
    // Activity Graph Data
    // ====================================

    const messages = await Message.find()
      .sort({
        createdAt: 1,
      })
      .lean();

    const hourlyMap: Record<string, number> = {};

    messages.forEach((msg: any) => {
      const date = new Date(msg.createdAt);

      const hour = `${date.getHours()}:00`;

      hourlyMap[hour] = (hourlyMap[hour] || 0) + 1;
    });

    const activityData = Object.entries(hourlyMap).map(([hour, count]) => ({
      hour,
      count,
    }));

    // ====================================
    // REAL TOKEN ANALYTICS
    // ====================================

    const logs = await InferenceLog.find().lean();

    let totalTokens = 0;

    let totalLatency = 0;

    logs.forEach((log: any) => {
      totalTokens += log.totalTokens || 0;

      totalLatency += log.latencyMs || 0;
    });

    const avgLatency =
      logs.length > 0 ? Math.round(totalLatency / logs.length) : 0;

    // ====================================
    // Latest Metrics
    // ====================================

    const latestLogs = await InferenceLog.find()
      .sort({
        createdAt: -1,
      })
      .limit(5)
      .lean();

    // ====================================
    // Response
    // ====================================

    return NextResponse.json({
      stats: {
        totalConversations,

        totalMessages,

        userMessages,

        assistantMessages,

        totalTokens,

        avgLatency,
      },

      activityData,

      recentMessages,

      latestLogs,
    });
  } catch (error) {
    console.error("[Dashboard API Error]", error);

    return NextResponse.json(
      {
        error: "Failed to fetch dashboard data",
      },
      {
        status: 500,
      },
    );
  }
}
