import React from 'react';
import {
  AlertTriangle,
  WifiOff,
  BatteryCharging,
  Compass,
  ShieldAlert,
  TreePine,
  Layers,
  CheckCircle2,
} from 'lucide-react';

export const FieldLimitations: React.FC = () => {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              Operational Constraints & Field Limitations Briefing
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                WildHack 2026 Challenge C
              </span>
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Why software alone cannot fight forest fires without accounting for real-world environmental, power, connectivity, and tiger reserve constraints in Tadoba-Andhari.
            </p>
          </div>
        </div>
      </div>

      {/* 4 Pillars Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Pillar 1: Environmental Limits */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-3">
          <div className="flex items-center gap-2.5 text-amber-400 font-bold text-sm">
            <TreePine className="w-5 h-5 text-amber-400" />
            <span>1. Environmental & Terrain Limits</span>
          </div>
          <ul className="space-y-2 text-xs text-slate-300 leading-relaxed">
            <li className="flex items-start gap-2">
              <span className="text-amber-400 font-bold">•</span>
              <span>
                <strong>Extreme Summer Microclimates:</strong> Chandrapur regularly experiences summer ambient temperatures exceeding <strong>47°C–48°C</strong>. High radiant surface heat can skew thermal radiance sensors and create spurious low-FRP anomalies.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-400 font-bold">•</span>
              <span>
                <strong>Dense Teak & Bamboo Canopy:</strong> Ground fires burning through dry bamboo leaf litter often spread beneath thick tree crowns, partially masking infrared radiance until crowning occurs.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-400 font-bold">•</span>
              <span>
                <strong>Tiger & Wildlife Safety Curfews:</strong> Night operations inside the 625 km² critical core zone are strictly limited to prevent dangerous nocturnal encounters with apex predators (tigers, leopards, sloth bears).
              </span>
            </li>
          </ul>
        </div>

        {/* Pillar 2: Power & Sensor Limits */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-3">
          <div className="flex items-center gap-2.5 text-cyan-400 font-bold text-sm">
            <BatteryCharging className="w-5 h-5 text-cyan-400" />
            <span>2. Power & Observation Cadence</span>
          </div>
          <ul className="space-y-2 text-xs text-slate-300 leading-relaxed">
            <li className="flex items-start gap-2">
              <span className="text-cyan-400 font-bold">•</span>
              <span>
                <strong>Satellite Overpass Frequency:</strong> Sun-synchronous low Earth orbit satellites (VIIRS NOAA-20, Suomi-NPP, MODIS) only pass over central India <strong>2 to 4 times every 24 hours</strong>. A fire starting between passes will not be detected by satellites until the next cycle.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-400 font-bold">•</span>
              <span>
                <strong>Remote Watchtower Solar Cycling:</strong> Field base towers in Kolsa and Pangdi operate on solar panels with lead-acid/lithium battery backup. Persistent overcast or smoke haze degrades battery recovery.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-400 font-bold">•</span>
              <span>
                <strong>Handheld Ranger Terminals:</strong> Responders operating in 45°C heat face rapid device thermal throttling and battery drainage when running continuous GPS and screen backlights.
              </span>
            </li>
          </ul>
        </div>

        {/* Pillar 3: Connectivity & Network Blackouts */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-3">
          <div className="flex items-center gap-2.5 text-red-400 font-bold text-sm">
            <WifiOff className="w-5 h-5 text-red-400" />
            <span>3. Connectivity & Communications Gap</span>
          </div>
          <ul className="space-y-2 text-xs text-slate-300 leading-relaxed">
            <li className="flex items-start gap-2">
              <span className="text-red-400 font-bold">•</span>
              <span>
                <strong>Zero Cellular Coverage in Deep Core:</strong> Vast swaths of the Andhari Wildlife Sanctuary valley have zero 4G/5G mobile tower reception to preserve wilderness tranquility.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-400 font-bold">•</span>
              <span>
                <strong>VHF High-Band Wireless Relays:</strong> Critical communications rely on Forest Department VHF walkie-talkies (channelized repeaters at Kolsa, Moharli, and Tadoba peak).
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-400 font-bold">•</span>
              <span>
                <strong>Store-and-Forward Architecture:</strong> Agni Kavach supports offline incident caching and resilient synchronization when ranger patrols re-enter network range at checkposts.
              </span>
            </li>
          </ul>
        </div>

        {/* Pillar 4: Navigation & Field Deployment Reality */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-3">
          <div className="flex items-center gap-2.5 text-emerald-400 font-bold text-sm">
            <Compass className="w-5 h-5 text-emerald-400" />
            <span>4. Road Routing vs Forest Reality</span>
          </div>
          <ul className="space-y-2 text-xs text-slate-300 leading-relaxed">
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold">•</span>
              <span>
                <strong>Paved Roads vs Firebreak Lines:</strong> Standard routing services (OSRM, Google Maps) only navigate public paved roads (e.g. Moharli-Chandrapur highway). They cannot navigate unpaved dirt firebreaks (firelines).
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold">•</span>
              <span>
                <strong>Locked Barrier Gates:</strong> Ranger entry points (Khutwanda, Navegaon, Pangdi) are locked at night or during anti-poaching security alerts and require keyholder dispatch.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold">•</span>
              <span>
                <strong>Non-Motorable Terrain:</strong> The last mile to a hotspot often requires on-foot deployment by strike teams carrying leaf blowers and water backpacks (fire beaters) rather than vehicle transit.
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* Ranger Decision Matrix Checklist */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-3">
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Agni Kavach Ranger Incident Verification SOP</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-300">
          <div className="bg-slate-950 p-3 rounded border border-slate-800">
            <div className="font-semibold text-amber-400 mb-1">Step 1: Signal Triage</div>
            <p className="text-[11px] text-slate-400">
              Check satellite confidence, FRP, and whether point lies in Core or Buffer. If P1, immediately notify Range Forest Officer (RFO).
            </p>
          </div>
          <div className="bg-slate-950 p-3 rounded border border-slate-800">
            <div className="font-semibold text-cyan-400 mb-1">Step 2: False Alarm Filter</div>
            <p className="text-[11px] text-slate-400">
              Check nearest watchtower log. Cross-reference agricultural calendar (stubble burning) and brick kilns near Ballarpur coal belt.
            </p>
          </div>
          <div className="bg-slate-950 p-3 rounded border border-slate-800">
            <div className="font-semibold text-emerald-400 mb-1">Step 3: Response Dispatch</div>
            <p className="text-[11px] text-slate-400">
              Mobilize Quick Response Team (QRT) from nearest gate with water tankers, fire beaters, and air blowers via authorized forest tracks.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
