import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * Power Automate calls this endpoint when a Planner task status changes.
 * Used for reverse sync: Planner → ManufUI.
 *
 * POST /api/planner-sync
 * Body: {
 *   planner_task_id: string,
 *   status: "completed" | "in_progress" | "not_started",
 *   percent_complete?: number
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { planner_task_id, status, percent_complete } = body;

    if (!planner_task_id) {
      return NextResponse.json(
        { error: "planner_task_id is required" },
        { status: 400 }
      );
    }

    const statusMap: Record<string, string> = {
      completed: "Tamamlandı",
      in_progress: "Devam Ediyor",
      not_started: "Açık",
    };

    let mappedStatus: string | undefined;

    if (status) {
      mappedStatus = statusMap[status];
    } else if (percent_complete !== undefined) {
      if (percent_complete >= 100) mappedStatus = "Tamamlandı";
      else if (percent_complete > 0) mappedStatus = "Devam Ediyor";
      else mappedStatus = "Açık";
    }

    if (!mappedStatus) {
      return NextResponse.json(
        { error: "Valid status or percent_complete is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("manuf_action_items")
      .update({
        status: mappedStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("planner_task_id", planner_task_id)
      .select("id, title, status");

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: "No matching action item found for this planner_task_id" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      updated: data,
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}
