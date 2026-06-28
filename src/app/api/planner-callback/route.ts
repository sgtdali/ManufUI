import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * Power Automate calls this endpoint after creating a Planner task
 * to write back the planner_task_id to manuf_action_items.
 *
 * POST /api/planner-callback
 * Body: { action_item_id: string, planner_task_id: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action_item_id, planner_task_id } = body;

    if (!action_item_id || !planner_task_id) {
      return NextResponse.json(
        { error: "action_item_id and planner_task_id are required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from("manuf_action_items")
      .update({
        planner_task_id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", action_item_id);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}
