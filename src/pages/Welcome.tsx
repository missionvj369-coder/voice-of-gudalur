
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ShieldAlert, Users, Bell, ArrowRight } from 'lucide-react';

const Welcome: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col bg-white font-sans selection:bg-emerald-100">
      {/* Hero Section */}
      <nav className="flex items-center justify-between px-6 py-6 lg:px-12">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <ShieldAlert size={20} />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900">Voice of Gudalur</span>
        </div>
        <button 
          onClick={() => navigate('/login')}
          className="rounded-full bg-emerald-600 px-6 py-2 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
        >
          Join Now
        </button>
      </nav>

      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <span className="mb-4 inline-block rounded-full bg-emerald-50 px-4 py-1.5 text-xs font-semibold tracking-wide text-emerald-700 uppercase">
            Gudalur Community Platform
          </span>
          <h1 className="mb-6 text-5xl font-extrabold tracking-tight text-slate-900 sm:text-6xl lg:text-7xl">
            Stay Informed.<br />
            <span className="text-emerald-600">Stay United.</span>
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-lg text-slate-600 sm:text-xl">
            The community operating system for Gudalur. Get real-time alerts on elephant sightings, emergencies, and local news. Verified, trusted, and fast.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <button 
              onClick={() => navigate('/login')}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-8 py-4 text-lg font-bold text-white transition-all hover:bg-slate-800 sm:w-auto"
            >
              Get Started <ArrowRight size={20} />
            </button>
            <button className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-8 py-4 text-lg font-bold text-slate-900 transition-all hover:bg-slate-50 sm:w-auto">
              Learn More
            </button>
          </div>
        </motion.div>

        {/* Features Preview */}
        <div className="mt-24 grid w-full max-w-6xl grid-cols-1 gap-8 md:grid-cols-3">
          {[
            { 
              icon: ShieldAlert, 
              title: 'Emergency Alerts', 
              desc: 'Instant notifications for elephant sightings and accidents directly to your phone.',
              color: 'bg-red-50 text-red-600'
            },
            { 
              icon: Users, 
              title: 'Verified Reports', 
              desc: 'Community-driven reporting system verified by local administrators for accuracy.',
              color: 'bg-blue-50 text-blue-600'
            },
            { 
              icon: Bell, 
              title: 'Instant Alerts', 
              desc: 'Get immediate notifications for sightings and emergencies directly on the platform.',
              color: 'bg-emerald-50 text-emerald-600'
            }
          ].map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 + i * 0.1 }}
              className="flex flex-col items-center rounded-2xl border border-slate-100 bg-white p-8 text-center shadow-sm transition-shadow hover:shadow-md"
            >
              <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${feature.color}`}>
                <feature.icon size={24} />
              </div>
              <h3 className="mb-2 text-xl font-bold text-slate-900">{feature.title}</h3>
              <p className="text-slate-500">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </main>

      <footer className="py-12 text-center text-sm text-slate-400">
        &copy; 2026 Voice of Gudalur. Designed for the people of Gudalur.
      </footer>
    </div>
  );
};

export default Welcome;
