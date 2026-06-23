import { transitionRunState, RunState } from '../state-machine';
import { SupabaseClient } from '@supabase/supabase-js';

describe('Run State Machine Helper', () => {
  let mockSupabase: any;
  let mockUpdate: any;
  let mockEq: any;
  let mockInsert: any;

  beforeEach(() => {
    // Mock the Supabase client chain
    mockEq = jest.fn().mockResolvedValue({ error: null });
    mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
    mockInsert = jest.fn().mockResolvedValue({ error: null });
    
    mockSupabase = {
      from: jest.fn((table: string) => {
        if (table === 'test_runs') return { update: mockUpdate };
        if (table === 'test_run_events') return { insert: mockInsert };
        return {};
      })
    };
  });

  it('allows valid transitions and writes a typed event', async () => {
    await expect(
      transitionRunState(
        mockSupabase as unknown as SupabaseClient,
        'run-123',
        'planned',
        'exploring',
        'start_test',
        { foo: 'bar' }
      )
    ).resolves.not.toThrow();

    expect(mockSupabase.from).toHaveBeenCalledWith('test_runs');
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      current_state: 'exploring',
      current_step: 'start_test'
    }));
    expect(mockEq).toHaveBeenCalledWith('id', 'run-123');

    expect(mockSupabase.from).toHaveBeenCalledWith('test_run_events');
    expect(mockInsert).toHaveBeenCalledWith([expect.objectContaining({
      test_run_id: 'run-123',
      from_state: 'planned',
      to_state: 'exploring',
      event_type: 'start_test',
      payload: { foo: 'bar' }
    })]);
  });

  it('persists action budget and step counters as expected', async () => {
    await expect(
      transitionRunState(
        mockSupabase as unknown as SupabaseClient,
        'run-456',
        'exploring',
        'exploring',
        'navigate_action',
        { url: 'http://test.com' },
        5, // actionCount
        15  // remaining
      )
    ).resolves.not.toThrow();

    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      current_state: 'exploring',
      current_step: 'navigate_action',
      action_count: 5,
      remaining_action_budget: 15
    }));
    
    expect(mockInsert).toHaveBeenCalledWith([expect.objectContaining({
      test_run_id: 'run-456',
      from_state: 'exploring',
      to_state: 'exploring',
      event_type: 'navigate_action',
      payload: { url: 'http://test.com' }
    })]);
  });

  it('rejects invalid transitions (e.g., reporting -> exploring)', async () => {
    await expect(
      transitionRunState(
        mockSupabase as unknown as SupabaseClient,
        'run-123',
        'reporting',
        'exploring',
        'back_to_work'
      )
    ).rejects.toThrow("Invalid state transition from 'reporting' to 'exploring'");
    
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it('rejects transitions from terminal states', async () => {
    await expect(
      transitionRunState(
        mockSupabase as unknown as SupabaseClient,
        'run-123',
        'done',
        'planned',
        'restart'
      )
    ).rejects.toThrow("Invalid state transition from 'done' to 'planned'");
  });
});

