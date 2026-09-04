import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Mic, Map, Image, PenLine, ShieldCheck } from 'lucide-react';

export const NavBar: React.FC = () => (
  <nav className="bg-[#AED581] text-[#1B5E20] py-2 px-4 flex items-center gap-4 shadow-md">
    <NavLink
      to="/"
      className={({ isActive }) =>
        isActive ? 'flex items-center gap-1 font-bold bg-[#1B5E20] text-[#AED581] px-3 py-1 rounded-lg' : 'flex items-center gap-1 hover:bg-[#1B5E20]/20 px-3 py-1 rounded-lg transition-colors'
      }
    >
      <Home size={18} /> Home
    </NavLink>
    <NavLink
      to="/voice-soundboard"
      className={({ isActive }) =>
        isActive ? 'flex items-center gap-1 font-bold bg-[#1B5E20] text-[#AED581] px-3 py-1 rounded-lg' : 'flex items-center gap-1 hover:bg-[#1B5E20]/20 px-3 py-1 rounded-lg transition-colors'
      }
    >
      <Mic size={18} /> Rise Voice
    </NavLink>
    <NavLink
      to="/live-gis-map"
      className={({ isActive }) =>
        isActive ? 'flex items-center gap-1 font-bold bg-[#1B5E20] text-[#AED581] px-3 py-1 rounded-lg' : 'flex items-center gap-1 hover:bg-[#1B5E20]/20 px-3 py-1 rounded-lg transition-colors'
      }
    >
      <Map size={18} /> GIS Map
    </NavLink>
    <NavLink
      to="/report-sighting"
      className={({ isActive }) =>
        isActive ? 'flex items-center gap-1 font-bold bg-[#1B5E20] text-[#AED581] px-3 py-1 rounded-lg' : 'flex items-center gap-1 hover:bg-[#1B5E20]/20 px-3 py-1 rounded-lg transition-colors'
      }
    >
      <Image size={18} /> Report Sighting
    </NavLink>
    <NavLink
      to="/sign-petition"
      className={({ isActive }) =>
        isActive ? 'flex items-center gap-1 font-bold bg-[#1B5E20] text-[#AED581] px-3 py-1 rounded-lg' : 'flex items-center gap-1 hover:bg-[#1B5E20]/20 px-3 py-1 rounded-lg transition-colors'
      }
    >
      <PenLine size={18} /> Sign Petition
    </NavLink>
    <NavLink
      to="/officials"
      className={({ isActive }) =>
        isActive ? 'flex items-center gap-1 font-bold bg-[#1B5E20] text-[#AED581] px-3 py-1 rounded-lg' : 'flex items-center gap-1 hover:bg-[#1B5E20]/20 px-3 py-1 rounded-lg transition-colors'
      }
    >
      <ShieldCheck size={18} /> Officials
    </NavLink>
  </nav>
);
