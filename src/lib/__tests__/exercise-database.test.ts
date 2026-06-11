import { sampleExercises } from '@/lib/exercise-database';
import { ExerciseSchema } from '@/lib/schemas';

describe('Exercise Database', () => {
  it('should contain valid exercise objects', () => {
    // Ensure the array is not empty
    expect(sampleExercises.length).toBeGreaterThan(0);

    // Validate each exercise against the ExerciseSchema
    for (const exercise of sampleExercises) {
      // The parse method will throw an error if the object doesn't match the schema
      expect(() => ExerciseSchema.parse(exercise)).not.toThrow();
    }
  });

  it('should have unique IDs for all exercises', () => {
    const ids = sampleExercises.map(ex => ex.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});
