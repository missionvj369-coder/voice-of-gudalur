/**
 * OneGudalur Community WhatsApp & SMS Broadcast Utility
 * Generates verified, cleanly formatted bilingual payloads with timestamps,
 * official dockets, and direct action links.
 */

export interface ShareAlertPayload {
  title: string;
  titleTa?: string;
  category: string;
  severity: string;
  location: string;
  description: string;
  source: string;
  verificationStatus: string;
  timestamp?: number;
}

export interface SharePetitionPayload {
  title: string;
  titleTa?: string;
  targetAuthority: string;
  evidenceSummary: string;
  supportCount: number;
  petitionId: string;
}

export interface ShareCivicIssuePayload {
  id: string;
  title: string;
  localityName: string;
  category: string;
  status: string;
  assignedAuthority?: string;
  officialGrievanceId?: string;
}

export interface ShareBusRoutePayload {
  routeNumber: string;
  routeName: string;
  routeNameTa?: string;
  from: string;
  to: string;
  via: string[];
  timings: string[];
  fareEstimate: string;
}

export const generateWhatsAppAlertText = (alert: ShareAlertPayload): string => {
  const timeStr = alert.timestamp ? new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  return `🚨 *[ONE GUDALUR - EMERGENCY ALERT / அவசர எச்சரிக்கை]* 🚨
━━━━━━━━━━━━━━━━━━━━
📌 *${alert.title}*
${alert.titleTa ? `📍 *${alert.titleTa}*\n` : ''}
⚡ *Severity / தீவிரம்:* ${alert.severity} (${alert.category})
📍 *Locality / பகுதி:* ${alert.location}
🕒 *Time:* ${timeStr} | ${dateStr}

📝 *Details / விவரம்:*
${alert.description}

🛡️ *Source:* ${alert.source}
✅ *Status:* ${alert.verificationStatus}

🔗 *Live Pulse & Helplines:* https://ai.studio/build/onegudalur
_Shared via OneGudalur Citizen Platform_`;
};

export const generateWhatsAppPetitionText = (petition: SharePetitionPayload): string => {
  return `📢 *[ONE GUDALUR - CITIZEN ACTION / மக்கள் கோரிக்கை]*
━━━━━━━━━━━━━━━━━━━━
🗳️ *${petition.title}*
${petition.titleTa ? `🏛️ *${petition.titleTa}*\n` : ''}
🎯 *Addressed To:* ${petition.targetAuthority}
👥 *Verified Resident Signatures:* ${petition.supportCount} citizens

📋 *Key Justification:*
${petition.evidenceSummary}

✊ *Sign & Back this Demand on OneGudalur:*
👉 https://ai.studio/build/onegudalur/act

_Every verified Gudalur resident signature counts towards official legislative representation._`;
};

export const generateWhatsAppCivicIssueText = (issue: ShareCivicIssuePayload): string => {
  return `🛠️ *[ONE GUDALUR - CIVIC ISSUE TRACKER]*
━━━━━━━━━━━━━━━━━━━━
📌 *Ticket ID:* ${issue.id}
📍 *Locality:* ${issue.localityName}
⚠️ *Problem:* ${issue.title}
🏷️ *Category:* ${issue.category.toUpperCase()} | *Status:* ${issue.status}
${issue.assignedAuthority ? `🏛️ *Assigned Authority:* ${issue.assignedAuthority}\n` : ''}${issue.officialGrievanceId ? `🔢 *Govt Token:* ${issue.officialGrievanceId}\n` : ''}
Track real-time progress on OneGudalur Civic Engine:
👉 https://ai.studio/build/onegudalur/issues`;
};

export const generateWhatsAppBusText = (bus: ShareBusRoutePayload): string => {
  return `🚌 *[GUDALUR TRANSIT NETWORK - TIMETABLE & FARE]*
━━━━━━━━━━━━━━━━━━━━
🚍 *${bus.routeNumber} - ${bus.routeName}*
${bus.routeNameTa ? `📍 ${bus.routeNameTa}\n` : ''}
🛣️ *Route:* ${bus.from} ➔ ${bus.to}
📍 *Key Stops:* ${bus.via.join(' • ')}
💰 *Estimated Fare:* ${bus.fareEstimate}

⏰ *Daily Departures:*
${bus.timings.slice(0, 8).join(' | ')}${bus.timings.length > 8 ? `\n+ ${bus.timings.length - 8} more trips` : ''}

_Check full Nilgiris & interstate timetable on OneGudalur_`;
};

export const shareToWhatsApp = (text: string) => {
  const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
};

export const shareViaWebShare = async (title: string, text: string) => {
  if (navigator.share) {
    try {
      await navigator.share({
        title,
        text,
        url: window.location.href
      });
      return true;
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        shareToWhatsApp(text);
      }
      return false;
    }
  } else {
    shareToWhatsApp(text);
    return true;
  }
};
