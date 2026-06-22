import { transitionRunState, RunState } from '../state-machine';
import { SupabaseClient } from '@supabase/supabase-js';

describe('Run State Machine Helper', () => {
  let mockSupabase: any;

  beforeEach(() => {
    // Mock the Supabase client chain
    const mockUpdate = jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) });
    const mockInsert = jest.fn().mockResolvedValue({ error: null });
    
    mockSupabase = {
      from: jest.fn((table: string) => {
        if (table === 'test_runs') return { update: mockUpdate };
        if (table === 'test_run_events') return { insert: mockInsert };
        return {};
      })
    };
  });

  it('allows valid transitions (e.g., planned -> exploring)', async () => {
    await expect(
      transitionRunState(
        mockSupabase as unknown as SupabaseClient,
        'run-123',
        'planned',
        'exploring',
        'start_test'
      )
    ).resolves.not.toThrow();

    expect(mockSupabase.from).toHaveBeenCalledWith('test_runs');
    expect(mockSupabase.from).toHaveBeenCalledWith('test_run_events');
  });

  it('allows self-transitions if valid (e.g., exploring -> exploring)', async () => {
    await expect(
      transitionRunState(
        mockSupabase as unknown as SupabaseClient,
        'run-123',
        'exploring',
        'exploring',
        'navigate_action',
        { url: 'http://test.com' },
        1, // actionCount
        9  // remaining
      )
    ).resolves.not.toThrow();
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
    ).rejects.toThrow();
  });
});
