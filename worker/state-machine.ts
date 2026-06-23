import { SupabaseClient } from '@supabase/supabase-js';

export type RunState = 'planned' | 'exploring' | 'awaiting_input' | 'judging' | 'reporting' | 'done' | 'failed';

const VALID_TRANSITIONS: Record<RunState, Set<RunState>> = {
  planned: new Set(['exploring', 'failed']),
  exploring: new Set(['exploring', 'awaiting_input', 'judging', 'failed']),
  awaiting_input: new Set(['exploring', 'failed']),
  judging: new Set(['reporting', 'failed']),
  reporting: new Set(['done', 'failed']),
  done: new Set([]),
  failed: new Set([]),
};

/**
 * Transitions the agent run state, validates legality, updates the test_runs table,
 * and inserts a typed event into test_run_events.
 */
export async function transitionRunState(
  supabase: SupabaseClient,
  testRunId: string,
  fromState: RunState,
  toState: RunState,
  eventType: string,
  payload?: any,
  actionCount?: number,
  remainingActionBudget?: number
): Promise<void> {
  if (!VALID_TRANSITIONS[fromState]?.has(toState)) {
    throw new Error(`Invalid state transition from '${fromState}' to '${toState}'`);
  }

  const updateData: any = {
    current_state: toState,
    current_step: eventType,
  };
  if (actionCount !== undefined) updateData.action_count = actionCount;
  if (remainingActionBudget !== undefined) updateData.remaining_action_budget = remainingActionBudget;

  const { error: runError } = await supabase
    .from('test_runs')
    .update(updateData)
    .eq('id', testRunId);

  if (runError) {
    throw new Error(`Failed to update test_runs state: ${runError.message}`);
  }

  const { error: eventError } = await supabase
    .from('test_run_events')
    .insert([{
      test_run_id: testRunId,
      event_type: eventType,
      from_state: fromState,
      to_state: toState,
      payload: payload || {}
    }]);

  if (eventError) {
    throw new Error(`Failed to insert test_run_event: ${eventError.message}`);
  }
}
