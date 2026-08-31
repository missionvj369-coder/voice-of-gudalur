import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Mic, Map, Image } from 'lucide-react';

export const NavBar: React.FC = () => (
  <nav className="bg-slate-900 text-slate-100 py-2 px-4 flex items-center gap-4">
    <NavLink
      to="/"
      className={({ isActive }) =>
        isActive ? 'flex items-center gap-1 font-bold' : 'flex items-center gap-1 hover:text-amber-300'
      }
    >
      <Home size={18} /> Home
    </NavLink>
    <NavLink
      to="/voice-soundboard"
      className={({ isActive }) =>
        isActive ? 'flex items-center gap-1 font-bold' : 'flex items-center gap-1 hover:text-amber-300'
      }
    >
      <Mic size={18} /> Soundboard
    </NavLink>
    <NavLink
      to="/live-gis-map"
      className={({ isActive }) =>
        isActive ? 'flex items-center gap-1 font-bold' : 'flex items-center gap-1 hover:text-amber-300'
      }
    >
      <Map size={18} /> GIS Map
    </NavLink>
    <NavLink
      to="/report-sighting"
      className={({ isActive }) =>
        isActive ? 'flex items-center gap-1 font-bold' : 'flex items-center gap-1 hover:text-amber-300'
      }
    >
      <Image size={18} /> Report Sighting
    </NavLink>
  </nav>
);
