import { cn } from '@/lib/utils';

describe('cn utility', () => {
  it('should merge tailwind classes', () => {
    expect(cn('p-4', 'font-bold', 'bg-red-500')).toBe('p-4 font-bold bg-red-500');
  });

  it('should override conflicting tailwind classes', () => {
    expect(cn('p-4', 'p-2')).toBe('p-2');
    expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500');
  });

  it('should handle conditional classes', () => {
    const isVisible = true;
    const isHidden = false;
    expect(cn('base-class', isVisible && 'visible-class', isHidden && 'hidden-class')).toBe('base-class visible-class');
  });

  it('should handle objects for conditional classes', () => {
    expect(cn({ 'class-a': true, 'class-b': false, 'class-c': true })).toBe('class-a class-c');
  });

  it('should handle arrays of classes', () => {
    expect(cn('class-a', ['class-b', 'class-c'])).toBe('class-a class-b class-c');
  });

  it('should handle a mix of arguments', () => {
    expect(cn('p-4', { 'font-bold': true }, ['m-2', 'bg-red-500'])).toBe('p-4 font-bold m-2 bg-red-500');
  });

  it('should return an empty string for falsy inputs', () => {
    expect(cn(null, undefined, false, '')).toBe('');
  });
});
