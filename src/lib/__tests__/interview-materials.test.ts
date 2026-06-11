import { materials } from '@/lib/interview-materials';

describe('Interview Materials', () => {
    it('should have unique slugs for all materials', () => {
        const slugs = materials.map(m => m.slug);
        const uniqueSlugs = new Set(slugs);
        expect(uniqueSlugs.size).toBe(slugs.length);
    });

    it('should have all required fields for each material', () => {
        for (const material of materials) {
            expect(material.slug).toBeDefined();
            expect(typeof material.slug).toBe('string');
            expect(material.slug.length).toBeGreaterThan(0);
            
            expect(material.title).toBeDefined();
            expect(typeof material.title).toBe('string');
            expect(material.title.length).toBeGreaterThan(0);
            
            expect(material.description).toBeDefined();
            expect(typeof material.description).toBe('string');
            expect(material.description.length).toBeGreaterThan(0);

            expect(material.category).toBeDefined();
            expect(['Behavioral', 'Technical', 'System Design']).toContain(material.category);
            
            expect(material.content).toBeDefined();
            expect(typeof material.content).toBe('string');
            expect(material.content.length).toBeGreaterThan(0);
        }
    });
});
