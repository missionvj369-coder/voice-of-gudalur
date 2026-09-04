import React from 'react';
import { ExternalLink, Paperclip } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

/**
 * GrievanceTicket — the Mudhalvarin Mugavari grievance ALREADY SUBMITTED to the
 * Chief Minister, rendered inline from the official portal's saved page
 * (embedding is blocked + the direct link redirects to login). Ticket #18982473.
 *
 * Source: cmhelpline.tnega.org — "Wildlife Sanctuaries Related"
 * Submitted by Universal Guard Trust (with Voice of Gudalur), 03 Sep 2026.
 */
export const GRIEVANCE_URL = 'https://cmhelpline.tnega.org/portal/en/ticket/35665012410302427';

const GRIEVANCE = {
  id: '18982473',
  title: 'Wildlife Sanctuaries Related (TN/ENVFOR/NLG/P/PORTAL/03SEP26/18982473)',
  status: 'Pending Action',
  statusColor: 'bg-amber-500/20 text-amber-300 border-amber-400/40',
  createdOn: '03 Sep 2026 · 11:48 AM',
  dueOn: '03 Oct 2026 · 11:48 AM',
  channel: 'Web',
  department: 'Environment Climate Change and Forests Department',
  subDepartment: 'Principal Chief Conservator of Forests (Head of Forest Dept)',
  assignedTo: 'Gudalur District Forest Officer',
  responsibleOfficer: 'District Forest Officer',
  district: 'Nilgiris (NLG)',
  taluk: 'Gudalur (4)',
  revenueDivision: 'Gudalur (92)',
  forestCircle: 'Ooty',
  forestDivision: 'Gudalur',
  ddForestDivision: 'Masinagudi',
  forestPcbZone: 'Coimbatore',
  petitionTa:
    'மாண்புமிகு தமிழ்நாடு முதலமைச்சர் திரு. விஜய் அவர்களுக்கு,\n' +
    'நீலகிரி மாவட்டம் கூடலூர், பந்தலூர் மற்றும் ஓ’வேலி பகுதிகளில் தொடர்ந்து ஏற்பட்டு வரும் மனித–வனவிலங்கு மோதல்கள் மற்றும் மனித உயிர்கள், வனவிலங்குகளின் பாதுகாப்பு தொடர்பான அபாயங்கள் குறித்து Universal Guard Trust சார்பில் இந்த அவசரக் குறைதீர் மனுவை மரியாதையுடன் சமர்ப்பிக்கிறோம்.\n' +
    'மனித உயிர்களையும் வனவிலங்குகளையும் பாதுகாக்க, மின்சார மற்றும் பிற உயிருக்கு ஆபத்தான காரணிகளைத் தடுப்பது, முன்கூட்டிய எச்சரிக்கை மற்றும் விரைவு நடவடிக்கை அமைப்புகளை வலுப்படுத்துவது, மேலும் துறைகளுக்கு இடையிலான ஒருங்கிணைந்த தடுப்பு நடவடிக்கைகளை உருவாக்குவது ஆகியவற்றில் தங்களின் உடனடி தலையீட்டை பணிவுடன் கேட்டுக்கொள்கிறோம்.\n' +
    '30 / 60 / 90 / 180 நாட்களுக்கான செயல்திட்டம் மற்றும் 13 முக்கிய கேள்விகளுடன் கூடிய விரிவான செயல் பிரதிநிதித்துவ மனு இணைக்கப்பட்டுள்ளது.\n' +
    'எங்கள் கோரிக்கை எளிமையானது:\n' +
    '• அபாயத்தை அடையாளம் காணுங்கள்.\n' +
    '• பொறுப்பை நிர்ணயியுங்கள்.\n' +
    '• காலக்கெடுவுக்குள் நடவடிக்கை எடுங்கள்.\n' +
    '• அடுத்த உயிரிழப்பைத் தடுக்குங்கள்.\n' +
    'மரியாதையுடன்,\n' +
    'Universal Guard Trust · Voice of Gudalur உடன் இணைந்து',
  petitioner: 'SUJEESH R',
  petitionerAddress: '6/6C, Saravanathottam, Kalliammal Colony, Thudiyalur, Coimbatore — 641034',
    attachment: 'UGT_Gudalur & Pandalur Executive Draftl.docx (56 KB)',
  /** English translation of the Tamil petition. */
  petitionEn:
    'Respected Chief Minister of Tamil Nadu,\n' +
    'This urgent complaint is respectfully submitted by Universal Guard Trust ' +
    'regarding the human–wildlife conflicts and the safety of human lives and ' +
    'wild animals occurring in the Gudalur, Pandalur, and Ooty areas of Nilgiris District.\n' +
    'To protect human lives and wild animals, to prevent electrical and other ' +
    'life-threatening factors, to strengthen early warning and rapid response ' +
    'actions, and to create integrated protection measures among departments, ' +
    'we respectfully request your immediate intervention.\n' +
    'A detailed implementation plan with a 30/60/90/180-day timeline and 13 key ' +
    'questions is attached hereto.\n' +
    'Our demands are simple:\n' +
    '• Identify the danger.\n' +
    '• Assign responsibility.\n' +
    '• Take action within the deadline.\n' +
    '• Prevent the next death.\n' +
    'Respectfully,\n' +
    'Universal Guard Trust · Voice of Gudalur',
};

interface GrievanceTicketProps {
  className?: string;
}

export const GrievanceTicket: React.FC<GrievanceTicketProps> = ({ className }) => {
  const { t } = useLanguage();

  const MetaRow = ({ label, value }: { label: string; value: string }) => (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wider text-[#9CA3AF]/70">
        {label}
      </span>
      <span className="text-sm text-[#E6F7E6]">{value}</span>
    </div>
  );

  return (
    <div className={className}>
      <div className="mb-4 flex items-center justify-center gap-2">
        <span className="text-3xl" aria-hidden>📨</span>
        <h2 className="text-xl font-serif font-bold text-[#F5F5F5]">
          {t('abt.grv_title')}
        </h2>
      </div>

      <div className="mb-4 text-center">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${GRIEVANCE.statusColor}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {GRIEVANCE.status}
        </span>
        <p className="mt-1 text-[11px] text-[#9CA3AF]">{GRIEVANCE.id}</p>
      </div>

      <div className="rounded-xl border border-white/10 bg-black/20 p-4 space-y-3">
        <p className="text-xs text-[#9CA3AF] uppercase tracking-wider">
          Tamil petition (original)
        </p>
        <pre
          className="whitespace-pre-wrap text-xs text-[#E6F7E6] leading-relaxed opacity-90"
          lang="ta"
        >
          {GRIEVANCE.petitionTa}
        </pre>
      </div>

      <div className="rounded-xl border border-white/10 bg-black/20 p-4 space-y-3 mt-3">
        <p className="text-xs text-[#9CA3AF] uppercase tracking-wider">
          English translation
        </p>
        <pre className="whitespace-pre-wrap text-xs text-[#E6F7E6] leading-relaxed opacity-90">
          {GRIEVANCE.petitionEn}
        </pre>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 mt-4">
        <MetaRow label="Created" value={GRIEVANCE.createdOn} />
        <MetaRow label="Due" value={GRIEVANCE.dueOn} />
        <MetaRow label="Channel" value={GRIEVANCE.channel} />
        <MetaRow label="Department" value={GRIEVANCE.department} />
        <MetaRow label="Sub-department" value={GRIEVANCE.subDepartment} />
        <MetaRow label="Assigned to" value={GRIEVANCE.assignedTo} />
        <MetaRow label="Officer" value={GRIEVANCE.responsibleOfficer} />
        <MetaRow label="District" value={GRIEVANCE.district} />
        <MetaRow label="Taluk" value={GRIEVANCE.taluk} />
        <MetaRow label="Revenue Division" value={GRIEVANCE.revenueDivision} />
        <MetaRow label="Forest Circle" value={GRIEVANCE.forestCircle} />
        <MetaRow label="Forest Division" value={GRIEVANCE.forestDivision} />
      </div>

      <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3 flex items-center gap-2">
        <Paperclip size={14} className="text-[#9CA3AF]" />
        <span className="text-xs text-[#E6F7E6]">{GRIEVANCE.attachment}</span>
      </div>

      <div className="mt-4 text-center">
        <a
          href={GRIEVANCE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:opacity-95"
        >
          <ExternalLink size={16} /> {t('abt.grv_btn')}
        </a>
        <p className="mt-2 text-[11px] text-[#9CA3AF]/70 leading-relaxed">
          {t('abt.grv_note')}
        </p>
      </div>
    </div>
  );
};

export default GrievanceTicket;
