export interface KuralLanguage {
  language: string;
  text: string;
  meaning: string;
}

export const athirukural: {
  number: number;
  chapter: string;
  languages: KuralLanguage[];
} = {
  number: 228,
  chapter: "கைம்மாறு வேண்டா கடப்பாடு",
  languages: [
    {
      language: "தமிழ்",
      text: "கைம்மாறு வேண்டா கடப்பாடு மாரிமாட்டு என்னாற்றும் கொல்லோ உலகு.",
      meaning: "பருவம் பெய்யும் மேகம் எந்த ஈடுமாற்றும் எதிபார்க்காமல் மழை பெய்கிறது; அதுபோல உண்மையான சமூக சேவை பரிகாரம் எதிபார்க்காமல் செய்ய வேண்டும்.",
    },
    {
      language: "English",
      text: "The rain cloud asks for nothing in return; true service to the world is given without expectation of reward.",
      meaning: "Like the rain cloud that showers water selflessly, genuine service to society is performed without seeking anything in return. The world thrives on such selfless contribution.",
    },
    {
      language: "മലയാളം",
      text: "മഴ പെയ്യുന്ന മേഘം യാതൊരു പ്രതിഫലവും ആഗ്രഹിക്കുന്നില്ല; ലോകത്തിനുള്ള യഥാർത്ഥ സേവനം പ്രതിഫലം പ്രതീക്ഷിക്കാതെ നൽകുന്നു.",
      meaning: "മഴയെന്ന മേഘം യാതൊരു പ്രതിഫലവും ആഗ്രഹിക്കാതെ മഴ പെയ്യുന്നത് പോലെ, സമൂഹത്തിനുള്ള യഥാർത്ഥ സേവനം പ്രതിഫലം ആഗ്രഹിക്കാതെ ചെയ്യണം.",
    },
    {
      language: "ಕನ್ನಡ",
      text: "ಮಳೆ ಮೋಡ ಯಾವುದೇ ಪ್ರತಿಫಲವನ್ನು ಬಯಸುವುದಿಲ್ಲ; ಲೋಕಕ್ಕೆ ನೈಜ ಸೇವೆ ಪ್ರತಿಫಲದ ನಿರೀಕ್ಷೆಯಿಲ್ಲದೆ ನೀಡಲ್ಪಡುತ್ತದೆ.",
      meaning: "ಮಳೆ ಮೋಡವು ಯಾವುದೇ ಪ್ರತಿಫಲವನ್ನು ಬಯಸದೆ ಮಳೆಗರೆಯುವಂತೆ, ಸಮಾಜಕ್ಕೆ ನೈಜ ಸೇವೆಯನ್ನು ಪ್ರತಿಫಲದ ನಿರೀಕ್ಷೆಯಿಲ್ಲದೆ ಮಾಡಬೇಕು.",
    },
  ],
};

export const footerQuote = {
  tamil: "இந்த மண் எங்களுக்கு என்ன செய்தது என்று கேட்காதே...\nஇந்த மண்ணுக்காக நாம் என்ன செய்தோம் என்று கேள்.",
  english: "Don't ask what this land has done for us...\nAsk what we have done for this land.",
  malayalam: "ഈ ഭൂമി നമുക്ക് എന്തു ചെയ്തു എന്ന് ചോദിക്കരുത്...\nഈ ഭൂമിക്കായി നമ്മൾ എന്തു ചെയ്തു എന്ന് ചോദിക്കൂ.",
  kannada: "ಈ ಭೂಮಿ ನಮಗೆ ಏನು ಮಾಡಿದೆ ಎಂದು ಕೇಳಬೇಡಿ...\nಈ ಭೂಮಿಗಾಗಿ ನಾವು ಏನು ಮಾಡಿದ್ದೇವೆ ಎಂದು ಕೇಳಿ.",
};
