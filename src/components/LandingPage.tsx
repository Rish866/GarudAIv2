import { motion } from 'framer-motion';
import {
  Truck,
  Route,
  Receipt,
  BarChart3,
  Shield,
  Zap,
  MapPin,
  Users,
  Check,
  ArrowRight,
  Star,
} from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
}

const features = [
  {
    icon: Truck,
    title: 'Fleet Management',
    description: 'Track every vehicle — owned, attached, or market hired.',
    color: 'bg-blue-100 text-blue-600',
  },
  {
    icon: Route,
    title: 'Trip Lifecycle',
    description: 'From booking to POD, manage the full trip workflow.',
    color: 'bg-indigo-100 text-indigo-600',
  },
  {
    icon: MapPin,
    title: 'GPS Tracking',
    description: 'Live location updates with speed and ignition status.',
    color: 'bg-cyan-100 text-cyan-600',
  },
  {
    icon: Receipt,
    title: 'Billing & GST',
    description: 'Auto-generate GST invoices with e-way bill integration.',
    color: 'bg-green-100 text-green-600',
  },
  {
    icon: Users,
    title: 'Driver Management',
    description: 'Assign drivers, track performance and compliance docs.',
    color: 'bg-violet-100 text-violet-600',
  },
  {
    icon: Shield,
    title: 'Document Vault',
    description: 'Store RC, insurance, permits — get expiry reminders.',
    color: 'bg-orange-100 text-orange-600',
  },
  {
    icon: Zap,
    title: 'Fuel Analytics',
    description: 'Monitor fuel consumption and spot inefficiencies fast.',
    color: 'bg-yellow-100 text-yellow-700',
  },
  {
    icon: BarChart3,
    title: 'Tyre Tracking',
    description: 'Track tyre life, rotations, and replacement schedules.',
    color: 'bg-rose-100 text-rose-600',
  },
  {
    icon: Route,
    title: 'Customer Portal',
    description: 'Give customers a branded portal to track their shipments.',
    color: 'bg-teal-100 text-teal-600',
  },
];

const steps = [
  {
    step: '01',
    title: 'Connect your GPS',
    description:
      'Integrate your existing GPS devices in minutes. We support 100+ device models used across India.',
    icon: MapPin,
  },
  {
    step: '02',
    title: 'Manage Operations',
    description:
      'Handle the full trip lifecycle — from enquiry and booking to delivery and POD collection.',
    icon: Truck,
  },
  {
    step: '03',
    title: 'Grow Revenue',
    description:
      'Use analytics and automated billing to cut costs, reduce disputes, and scale confidently.',
    icon: BarChart3,
  },
];

const plans = [
  {
    name: 'Starter',
    price: '₹2,999',
    period: '/month',
    description: 'Perfect for small fleets getting started',
    vehicles: 'Up to 10 vehicles',
    popular: false,
    features: [
      'Fleet & trip management',
      'Basic GPS tracking',
      'GST billing',
      '5 user accounts',
      'Email support',
      'Document vault (1 GB)',
    ],
  },
  {
    name: 'Professional',
    price: '₹7,999',
    period: '/month',
    description: 'For growing transport businesses',
    vehicles: 'Up to 50 vehicles',
    popular: true,
    features: [
      'Everything in Starter',
      'Advanced analytics',
      'Driver payroll',
      'Tyre tracking',
      'Fuel analytics',
      '20 user accounts',
      'Priority support',
      'Document vault (10 GB)',
    ],
  },
  {
    name: 'Enterprise',
    price: '₹14,999',
    period: '/month',
    description: 'Built for large-scale operations',
    vehicles: 'Unlimited vehicles',
    popular: false,
    features: [
      'Everything in Professional',
      'Multi-branch support',
      'Customer tracking portal',
      'Custom integrations',
      'Unlimited users',
      'Dedicated account manager',
      'Document vault (unlimited)',
      'SLA guarantee',
    ],
  },
];

const testimonials = [
  {
    quote:
      'Garud AI transformed our operations completely. We saved 20% on fuel costs and cut billing time by 80%.',
    author: 'Amit Patel',
    role: 'CEO, Patel Logistics',
    rating: 5,
  },
  {
    quote:
      'The GPS tracking and trip management modules are exactly what we needed. Our customers love the tracking portal.',
    author: 'Sunita Reddy',
    role: 'Operations Head, SR Freight Services',
    rating: 5,
  },
];

const stats = [
  { value: '2000+', label: 'Trucks Tracked' },
  { value: '₹50Cr+', label: 'Freight Managed' },
  { value: '500+', label: 'Transport Companies' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-white font-sans overflow-x-hidden">
      {/* ── NAV ── */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-gray-900/60 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Truck size={18} className="text-white" />
            </div>
            <span className="text-lg font-bold text-white">Garud AI</span>
          </div>
          <button
            onClick={onGetStarted}
            className="px-5 py-2 rounded-lg text-sm font-semibold text-white border border-white/30 hover:bg-white/10 transition-colors"
          >
            Login
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center pt-16 px-4 overflow-hidden">
        {/* Background Image — Logistics truck highway */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: 'url("https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=1920&q=80")',
          }}
        />
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/80 via-gray-900/70 to-blue-900/80" />
        {/* Animated particles effect */}
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 25% 50%, rgba(59,130,246,0.3) 0%, transparent 50%), radial-gradient(circle at 75% 50%, rgba(99,102,241,0.3) 0%, transparent 50%)' }} />

        <div className="relative max-w-4xl mx-auto text-center z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white text-xs font-semibold mb-6"
          >
            <Zap size={12} className="text-yellow-400" />
            AI-Powered Transport ERP — 49 Modules
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-7xl font-extrabold text-white leading-tight tracking-tight"
          >
            India&apos;s Smartest
            <span className="block bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
              Transport ERP
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-6 text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed"
          >
            From enquiry to profit — fleet tracking, trip management, billing, compliance, AI analytics. Everything a transporter needs, in one powerful platform.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <button
              onClick={onGetStarted}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-white text-sm font-bold bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 shadow-2xl shadow-blue-500/40 hover:shadow-blue-500/60 transition-all transform hover:scale-105"
            >
              Start Free Trial
              <ArrowRight size={16} />
            </button>
            <button className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-white text-sm font-semibold border border-white/30 hover:border-white/60 hover:bg-white/10 backdrop-blur-sm transition-all">
              Watch Demo
            </button>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.45 }}
            className="mt-16 grid grid-cols-3 gap-6 max-w-lg mx-auto"
          >
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-2xl font-bold text-white">{s.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-3">
              Everything you need
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Built for Indian Transport Businesses
            </h2>
            <p className="mt-4 text-gray-500 max-w-2xl mx-auto">
              From a single truck owner to a 500-vehicle fleet — Garud AI scales with you.
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.title}
                  variants={itemVariants}
                  className="group p-6 rounded-2xl border border-gray-100 hover:border-blue-100 hover:shadow-lg hover:shadow-blue-500/5 transition-all cursor-default"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${f.color} mb-4`}>
                    <Icon size={20} />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">{f.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{f.description}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-24 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-3">
              Simple onboarding
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">How It Works</h2>
            <p className="mt-4 text-gray-500 max-w-xl mx-auto">
              Get up and running in under a day. No tech team required.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((s, i) => {
              const Icon = s.icon;
              return (
                <motion.div
                  key={s.step}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.15 }}
                  className="relative flex flex-col items-center text-center p-8 bg-white rounded-2xl border border-gray-100 shadow-sm"
                >
                  <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-5xl font-black text-blue-50 select-none pointer-events-none">
                    {s.step}
                  </span>
                  <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center mb-5 shadow-lg shadow-blue-500/30">
                    <Icon size={24} className="text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{s.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{s.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-3">
              Transparent pricing
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Plans That Grow With You
            </h2>
            <p className="mt-4 text-gray-500">No hidden fees. Cancel anytime.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className={`relative flex flex-col rounded-2xl border p-8 ${
                  plan.popular
                    ? 'border-blue-500 shadow-xl shadow-blue-500/10 bg-blue-600 text-white'
                    : 'border-gray-200 bg-white text-gray-900'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-blue-400 to-indigo-400 text-white text-xs font-bold shadow-md whitespace-nowrap">
                    MOST POPULAR
                  </div>
                )}

                <div className="mb-6">
                  <h3
                    className={`text-lg font-bold mb-1 ${plan.popular ? 'text-white' : 'text-gray-900'}`}
                  >
                    {plan.name}
                  </h3>
                  <p className={`text-xs mb-4 ${plan.popular ? 'text-blue-100' : 'text-gray-500'}`}>
                    {plan.description}
                  </p>
                  <div className="flex items-baseline gap-1">
                    <span
                      className={`text-4xl font-extrabold ${plan.popular ? 'text-white' : 'text-gray-900'}`}
                    >
                      {plan.price}
                    </span>
                    <span className={`text-sm ${plan.popular ? 'text-blue-200' : 'text-gray-400'}`}>
                      {plan.period}
                    </span>
                  </div>
                  <p
                    className={`text-xs mt-2 font-medium ${plan.popular ? 'text-blue-100' : 'text-blue-600'}`}
                  >
                    {plan.vehicles}
                  </p>
                </div>

                <ul className="flex-1 space-y-3 mb-8">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2.5 text-sm">
                      <Check
                        size={15}
                        className={`flex-shrink-0 mt-0.5 ${plan.popular ? 'text-blue-200' : 'text-blue-600'}`}
                      />
                      <span className={plan.popular ? 'text-blue-50' : 'text-gray-600'}>
                        {feat}
                      </span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={onGetStarted}
                  className={`w-full py-3 rounded-xl text-sm font-semibold transition-all ${
                    plan.popular
                      ? 'bg-white text-blue-600 hover:bg-blue-50 shadow-md'
                      : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20'
                  }`}
                >
                  Get Started
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-24 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-14"
          >
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-3">
              Trusted by transporters
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              What Our Customers Say
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.author}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm"
              >
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} size={14} className="text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <blockquote className="text-gray-700 text-sm leading-relaxed mb-6">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold">
                    {t.author.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{t.author}</p>
                    <p className="text-xs text-gray-500">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA SECTION ── */}
      <section className="py-24 px-4 bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto text-center"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-white leading-tight">
            Ready to digitize your transport business?
          </h2>
          <p className="mt-4 text-blue-100 text-lg">
            Join 500+ transport companies already running on Garud AI.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onGetStarted}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-white text-blue-700 text-sm font-semibold hover:bg-blue-50 shadow-xl transition-all"
            >
              Start Free Trial
              <ArrowRight size={16} />
            </button>
            <button className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-white text-sm font-semibold border border-white/30 hover:bg-white/10 transition-all">
              Contact Sales
            </button>
          </div>
          <p className="mt-6 text-blue-200 text-xs">
            No credit card required · 14-day free trial · Cancel anytime
          </p>
        </motion.div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-10">
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <Truck size={16} className="text-white" />
                </div>
                <span className="text-white font-bold text-base">Garud AI</span>
              </div>
              <p className="text-sm leading-relaxed max-w-xs">
                India&apos;s most complete Transport ERP — built for the road ahead.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 text-sm">
              <div>
                <p className="text-white font-semibold mb-3">Product</p>
                <ul className="space-y-2">
                  {['Features', 'Pricing', 'Changelog', 'Roadmap'].map((l) => (
                    <li key={l}>
                      <a href="#" className="hover:text-white transition-colors">
                        {l}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-white font-semibold mb-3">Company</p>
                <ul className="space-y-2">
                  {['About', 'Blog', 'Careers', 'Contact'].map((l) => (
                    <li key={l}>
                      <a href="#" className="hover:text-white transition-colors">
                        {l}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-white font-semibold mb-3">Legal</p>
                <ul className="space-y-2">
                  {['Privacy', 'Terms', 'Security', 'Cookies'].map((l) => (
                    <li key={l}>
                      <a href="#" className="hover:text-white transition-colors">
                        {l}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            <p>&copy; {new Date().getFullYear()} Garud AI. All rights reserved.</p>
            <p>Made with ❤️ for Indian transporters</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
