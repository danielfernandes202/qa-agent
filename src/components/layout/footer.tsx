import Link from 'next/link';
import { BrandLogo } from '../icons/BrandLogo';
import { Github, Twitter, Linkedin } from 'lucide-react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="py-16 border-t border-border bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <BrandLogo className="w-8 h-8 text-primary" glow={false} />
                <span className="text-xl font-bold tracking-tight text-foreground">QAgent</span>
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed max-w-sm mb-8">
                Empowering modern development teams with intelligent QA automation, visual testing, and Playwright code generation.
              </p>
              <div className="flex gap-6">
                <Github className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer" />
                <Twitter className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer" />
                <Linkedin className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer" />
              </div>
            </div>

            <div>
              <h5 className="font-semibold text-foreground mb-6">Tools</h5>
              <ul className="space-y-4 text-sm text-muted-foreground">
                 <li><Link href="/qa-test-assistant/standalone-generator" className="hover:text-primary transition-colors">Test Generator</Link></li>
                 <li><Link href="/qa-test-assistant/visual-tester" className="hover:text-primary transition-colors">Visual Tester</Link></li>
                 <li><Link href="/qa-test-assistant/document-importer" className="hover:text-primary transition-colors">Document Importer</Link></li>
              </ul>
            </div>
            
            <div>
              <h5 className="font-semibold text-foreground mb-6">Legal</h5>
              <ul className="space-y-4 text-sm text-muted-foreground">
                <li><Link href="/privacy-policy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm text-muted-foreground">
              © {currentYear} QAgent. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
  );
};

export default Footer;
