"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import {
  Brain,
  Eye,
  Heart,
  Layers,
  ArrowRight,
  Sparkles,
  TrendingUp,
  User,
  CheckCircle2,
  X,
} from "lucide-react";


// Fade animation
const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay },
  }),
};

function FadeUp({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      custom={delay}
      variants={fadeUp}
      className={className}
    >
      {children}
    </motion.div>
  );
}


// Navbar
function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-border">
      <nav className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
        <span className="font-display text-xl font-semibold text-foreground tracking-tight">
          ClarityMind
        </span>

        <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <button onClick={() => scrollTo("how-it-works")}>
            How it works
          </button>
          <button onClick={() => scrollTo("different")}>
            Why different
          </button>
          <button onClick={() => scrollTo("vision")}>
            Vision
          </button>
        </div>

        <Button
          onClick={() => scrollTo("waitlist")}
          className="bg-primary text-primary-foreground hover:bg-primary/90 text-sm px-5 h-9 rounded-full"
        >
          Join Waitlist
        </Button>
      </nav>
    </header>
  );
}


// Hero
function Hero() {
  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <section className="relative overflow-hidden pt-20 pb-28 px-6">

      <div className="relative max-w-3xl mx-auto text-center">

        <FadeUp delay={0}>
          <Badge className="mb-6 bg-accent text-accent-foreground border-0 text-xs font-medium px-4 py-1.5 rounded-full">
            <Sparkles className="w-3 h-3 mr-1.5" />
            AI-Powered Thinking Clarity
          </Badge>
        </FadeUp>

        <FadeUp delay={0.1}>
          <h1 className="font-display text-5xl md:text-6xl font-semibold">
            Understand your{" "}
            <span className="italic text-primary">
              thoughts
            </span>{" "}
            clearly
          </h1>
        </FadeUp>

        <FadeUp delay={0.2}>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mt-6">
            Most people can't tell the difference between a fact and a story
            their mind creates. ClarityMind helps you see the difference.
          </p>
        </FadeUp>

        <FadeUp delay={0.3}>
          <div className="flex justify-center gap-4 mt-8">
            <Button
              onClick={() => scrollTo("waitlist")}
              className="px-8 h-12 rounded-full"
            >
              Join the Waitlist
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>

            <button
              onClick={() => scrollTo("how-it-works")}
              className="text-muted-foreground underline"
            >
              See how it works
            </button>
          </div>
        </FadeUp>

      </div>
    </section>
  );
}


// Problem Section
function ProblemSection() {
  const thoughts = [
    "My career is finished.",
    "Nobody respects me.",
    "This will never work out.",
    "I will end up alone.",
  ];

  return (
    <section id="problem" className="py-24 px-6">
      <div className="max-w-4xl mx-auto">

        <FadeUp>
          <h2 className="text-4xl font-semibold mb-6">
            Your mind creates stories.
          </h2>
          <p className="text-lg text-muted-foreground mb-12">
            When something stressful happens, the mind instantly generates
            conclusions that feel real.
          </p>
        </FadeUp>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {thoughts.map((thought, i) => (
            <FadeUp key={thought} delay={i * 0.08}>
              <div className="rounded-2xl p-6 border bg-card">
                <div className="flex items-center gap-3">
                  <Brain className="w-4 h-4 text-primary" />
                  <p className="font-medium text-sm">
                    “{thought}”
                  </p>
                </div>
              </div>
            </FadeUp>
          ))}
        </div>

      </div>
    </section>
  );
}


// Waitlist Section
function WaitlistSection() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) setSubmitted(true);
  };

  return (
    <section id="waitlist" className="py-28 px-6 text-center">

      <FadeUp>
        <h2 className="text-4xl font-semibold mb-6">
          Start understanding your mind
        </h2>
      </FadeUp>

      <FadeUp delay={0.1}>
        {submitted ? (
          <div className="border rounded-xl p-6 inline-block">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-3 text-primary" />
            <p className="font-semibold">You're on the list!</p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="flex gap-3 justify-center"
          >
            <Input
              ref={inputRef}
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-12 w-64"
            />

            <Button type="submit" className="h-12 px-8">
              Join Waitlist
            </Button>
          </form>
        )}
      </FadeUp>

    </section>
  );
}


// Footer
function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t py-8 text-center text-sm text-muted-foreground">
      © {year} ClarityMind
    </footer>
  );
}


// Page (Next.js)
export default function Page() {
  return (
    <div className="min-h-screen font-sans antialiased">
      <Navbar />
      <main>
        <Hero />
        <ProblemSection />
        <WaitlistSection />
      </main>
      <Footer />
    </div>
  );
}