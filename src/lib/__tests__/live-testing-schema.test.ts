import { LiveTestingOutputSchema } from '../../../worker/utils';

describe('LiveTestingOutputSchema', () => {
  it('validates a finding with the new intent fields', () => {
    const data = {
      testsPerformed: ["action 1"],
      agentLogs: ["log 1"],
      bugsIdentified: [
        {
          id: "bug-1",
          type: "layout",
          severity: "high",
          title: "Broken layout",
          description: "The layout is broken",
          suggestions: ["Fix layout"],
          intentViolated: true,
          expectedByIntent: "The button should be blue",
          actualBehavior: "The button is red"
        }
      ]
    };
    
    const result = LiveTestingOutputSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.bugsIdentified[0].intentViolated).toBe(true);
      expect(result.data.bugsIdentified[0].expectedByIntent).toBe("The button should be blue");
    }
  });

  it('validates output with NO intent fields (backward compatible)', () => {
    const data = {
      testsPerformed: ["action 1"],
      agentLogs: ["log 1"],
      bugsIdentified: [
        {
          id: "bug-2",
          type: "content",
          severity: "low",
          title: "Typo in title",
          description: "Found a typo",
          suggestions: ["Fix typo"]
        }
      ]
    };
    
    const result = LiveTestingOutputSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.bugsIdentified[0].intentViolated).toBeUndefined();
    }
  });
});
