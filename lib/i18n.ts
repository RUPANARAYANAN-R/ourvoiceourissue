/**
 * NammaKural Multilingual i18n Configuration
 * Supports: Tamil, Hindi, Kannada, Malayalam, Telugu, Bengali, Urdu
 */

export interface LanguageConfig {
  code: string;          // ISO 639-1 code (ta, hi, kn, ml, te, bn, ur)
  bcp47: string;         // BCP-47 for SpeechRecognition (ta-IN, hi-IN, etc.)
  name: string;          // Native script name
  nameEn: string;        // English name
  direction: 'ltr' | 'rtl';
  fontClass: string;     // CSS font-family class
  placeholder: string;   // Sample grievance text
  greeting: string;      // Welcome greeting
  ui: {
    tapToSpeak: string;
    orTypeYourIssue: string;
    listeningMessage: string;
    liveSpeechCaptured: string;
    tapToStop: string;
    aiAnalyzing: string;
    convertingSpeech: string;
    extractingEntities: string;
    validatingRules: string;
    weHeardYou: string;
    capturedTranscript: string;
    continueBtn: string;
    missingInfo: string;
    moreDetails: string;
    provideDetails: string;
    looksGood: string;
    readyToSubmit: string;
    fileGrievance: string;
    success: string;
    successMessage: string;
    successMessageMulti: string;
    trackStatus: string;
    fileAnother: string;
    cancel: string;
    howCanWeHelp: string;
    skipQuestion: string;
  };
}

export const SUPPORTED_LANGUAGES: LanguageConfig[] = [
  {
    code: 'en',
    bcp47: 'en-IN',
    name: 'English',
    nameEn: 'English',
    direction: 'ltr',
    fontClass: '',
    placeholder: 'There has been no water in our area for three days...',
    greeting: 'Hello.',
    ui: {
      tapToSpeak: 'Tap to Speak',
      orTypeYourIssue: 'Or type your issue:',
      listeningMessage: '🎙️ Listening... Speak in English',
      liveSpeechCaptured: '🎙️ Live Speech Captured',
      tapToStop: 'Tap to Stop',
      aiAnalyzing: 'AI is analyzing...',
      convertingSpeech: '🎙️ Converting speech to text',
      extractingEntities: '🧠 Extracting information',
      validatingRules: '🛡️ Validating rules',
      weHeardYou: 'We heard you clearly.',
      capturedTranscript: 'Captured speech (edit if needed):',
      continueBtn: 'Continue →',
      missingInfo: 'Missing Information',
      moreDetails: 'A few more details are needed for proper routing.',
      provideDetails: 'Provide Details',
      looksGood: 'Looks good. Next →',
      readyToSubmit: 'Ready to Submit',
      fileGrievance: 'File Official Grievance',
      success: 'Success.',
      successMessage: 'Grievance registered successfully.',
      successMessageMulti: '{count} grievances registered successfully.',
      trackStatus: 'Track Status',
      fileAnother: 'File Another',
      cancel: '✕ Cancel',
      howCanWeHelp: 'How can we help you today?',
      skipQuestion: 'Skip this question',
    },
  },
  {
    code: 'ta',
    bcp47: 'ta-IN',
    name: 'தமிழ்',
    nameEn: 'Tamil',
    direction: 'ltr',
    fontClass: 'font-tamil',
    placeholder: 'எங்க ஊர்ல மூணு நாளா தண்ணி வரல...',
    greeting: 'வணக்கம்.',
    ui: {
      tapToSpeak: 'பேச தட்டவும்',
      orTypeYourIssue: 'அல்லது உங்கள் பிரச்சினையை தட்டச்சு செய்யுங்கள்:',
      listeningMessage: '🎙️ கேட்கிறது... தமிழில் பேசுங்கள்',
      liveSpeechCaptured: '🎙️ நேரடி உரை (Live Speech Captured)',
      tapToStop: 'நிறுத்த தட்டவும்',
      aiAnalyzing: 'AI பகுப்பாய்வு செய்கிறது...',
      convertingSpeech: '🎙️ பேச்சை உரையாக மாற்றுகிறது',
      extractingEntities: '🧠 தகவல்களை பிரித்தெடுக்கிறது',
      validatingRules: '🛡️ விதிகளை சரிபார்க்கிறது',
      weHeardYou: 'உங்கள் குரல் தெளிவாக கேட்டது.',
      capturedTranscript: 'பதிவான பேச்சு (தேவையெனில் திருத்தவும்):',
      continueBtn: 'தொடரவும் →',
      missingInfo: 'விடுபட்ட தகவல்கள்',
      moreDetails: 'சரியாக வழிநடத்த சில கூடுதல் விவரங்கள் தேவை.',
      provideDetails: 'விவரங்களை வழங்கவும்',
      looksGood: 'சரியாக உள்ளது. அடுத்து →',
      readyToSubmit: 'சமர்ப்பிக்க தயார்',
      fileGrievance: 'அதிகாரப்பூர்வ புகார் பதிவு',
      success: 'வெற்றி.',
      successMessage: 'புகார் வெற்றிகரமாக பதிவு செய்யப்பட்டது.',
      successMessageMulti: '{count} புகார்கள் வெற்றிகரமாக பதிவு செய்யப்பட்டன.',
      trackStatus: 'நிலையை கண்காணி',
      fileAnother: 'மற்றொரு புகார்',
      cancel: '✕ ரத்து',
      howCanWeHelp: 'இன்று நாங்கள் எவ்வாறு உதவலாம்?',
      skipQuestion: 'இந்தக் கேள்வியைத் தவிர்க்கவும்',
    },
  },
  {
    code: 'hi',
    bcp47: 'hi-IN',
    name: 'हिन्दी',
    nameEn: 'Hindi',
    direction: 'ltr',
    fontClass: 'font-hindi',
    placeholder: 'हमारे इलाके में तीन दिनों से पानी नहीं आ रहा...',
    greeting: 'नमस्ते.',
    ui: {
      tapToSpeak: 'बोलने के लिए टैप करें',
      orTypeYourIssue: 'या अपनी समस्या टाइप करें:',
      listeningMessage: '🎙️ सुन रहे हैं... हिंदी में बोलें',
      liveSpeechCaptured: '🎙️ लाइव स्पीच (Live Speech Captured)',
      tapToStop: 'रोकने के लिए टैप करें',
      aiAnalyzing: 'AI विश्लेषण कर रहा है...',
      convertingSpeech: '🎙️ बोली को टेक्स्ट में बदल रहे हैं',
      extractingEntities: '🧠 जानकारी निकाल रहे हैं',
      validatingRules: '🛡️ नियमों की जांच कर रहे हैं',
      weHeardYou: 'हमने आपकी बात स्पष्ट रूप से सुनी.',
      capturedTranscript: 'रिकॉर्ड की गई बात (जरूरत हो तो संपादित करें):',
      continueBtn: 'आगे बढ़ें →',
      missingInfo: 'अधूरी जानकारी',
      moreDetails: 'सही रूटिंग के लिए कुछ और विवरण चाहिए.',
      provideDetails: 'विवरण दें',
      looksGood: 'सही है. आगे →',
      readyToSubmit: 'जमा करने के लिए तैयार',
      fileGrievance: 'आधिकारिक शिकायत दर्ज करें',
      success: 'सफल.',
      successMessage: 'शिकायत सफलतापूर्वक दर्ज की गई.',
      successMessageMulti: '{count} शिकायतें सफलतापूर्वक दर्ज की गईं.',
      trackStatus: 'स्थिति ट्रैक करें',
      fileAnother: 'एक और शिकायत',
      cancel: '✕ रद्द करें',
      howCanWeHelp: 'आज हम आपकी कैसे मदद कर सकते हैं?',
      skipQuestion: 'यह सवाल छोड़ें',
    },
  },
  {
    code: 'kn',
    bcp47: 'kn-IN',
    name: 'ಕನ್ನಡ',
    nameEn: 'Kannada',
    direction: 'ltr',
    fontClass: 'font-kannada',
    placeholder: 'ನಮ್ಮ ಪ್ರದೇಶದಲ್ಲಿ ಮೂರು ದಿನಗಳಿಂದ ನೀರು ಬರುತ್ತಿಲ್ಲ...',
    greeting: 'ನಮಸ್ಕಾರ.',
    ui: {
      tapToSpeak: 'ಮಾತನಾಡಲು ಟ್ಯಾಪ್ ಮಾಡಿ',
      orTypeYourIssue: 'ಅಥವಾ ನಿಮ್ಮ ಸಮಸ್ಯೆಯನ್ನು ಟೈಪ್ ಮಾಡಿ:',
      listeningMessage: '🎙️ ಕೇಳುತ್ತಿದೆ... ಕನ್ನಡದಲ್ಲಿ ಮಾತನಾಡಿ',
      liveSpeechCaptured: '🎙️ ನೇರ ಮಾತು (Live Speech Captured)',
      tapToStop: 'ನಿಲ್ಲಿಸಲು ಟ್ಯಾಪ್ ಮಾಡಿ',
      aiAnalyzing: 'AI ವಿಶ್ಲೇಷಿಸುತ್ತಿದೆ...',
      convertingSpeech: '🎙️ ಮಾತನ್ನು ಪಠ್ಯಕ್ಕೆ ಪರಿವರ್ತಿಸುತ್ತಿದೆ',
      extractingEntities: '🧠 ಮಾಹಿತಿಯನ್ನು ಹೊರತೆಗೆಯುತ್ತಿದೆ',
      validatingRules: '🛡️ ನಿಯಮಗಳನ್ನು ಪರಿಶೀಲಿಸುತ್ತಿದೆ',
      weHeardYou: 'ನಿಮ್ಮ ಧ್ವನಿ ಸ್ಪಷ್ಟವಾಗಿ ಕೇಳಿಸಿತು.',
      capturedTranscript: 'ಸೆರೆಹಿಡಿಯಲಾದ ಮಾತು (ಅಗತ್ಯವಿದ್ದರೆ ಸಂಪಾದಿಸಿ):',
      continueBtn: 'ಮುಂದುವರಿಸಿ →',
      missingInfo: 'ಕಾಣೆಯಾದ ಮಾಹಿತಿ',
      moreDetails: 'ಸರಿಯಾಗಿ ನಿರ್ದೇಶಿಸಲು ಕೆಲವು ಹೆಚ್ಚಿನ ವಿವರಗಳು ಬೇಕು.',
      provideDetails: 'ವಿವರಗಳನ್ನು ಒದಗಿಸಿ',
      looksGood: 'ಸರಿಯಾಗಿದೆ. ಮುಂದೆ →',
      readyToSubmit: 'ಸಲ್ಲಿಸಲು ಸಿದ್ಧ',
      fileGrievance: 'ಅಧಿಕೃತ ದೂರು ದಾಖಲಿಸಿ',
      success: 'ಯಶಸ್ಸು.',
      successMessage: 'ದೂರು ಯಶಸ್ವಿಯಾಗಿ ದಾಖಲಾಗಿದೆ.',
      successMessageMulti: '{count} ದೂರುಗಳು ಯಶಸ್ವಿಯಾಗಿ ದಾಖಲಾಗಿವೆ.',
      trackStatus: 'ಸ್ಥಿತಿ ಟ್ರ್ಯಾಕ್ ಮಾಡಿ',
      fileAnother: 'ಮತ್ತೊಂದು ದೂರು',
      cancel: '✕ ರದ್ದುಮಾಡಿ',
      howCanWeHelp: 'ಇಂದು ನಾವು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?',
      skipQuestion: 'ಈ ಪ್ರಶ್ನೆಯನ್ನು ಬಿಡಿ',
    },
  },
  {
    code: 'ml',
    bcp47: 'ml-IN',
    name: 'മലയാളം',
    nameEn: 'Malayalam',
    direction: 'ltr',
    fontClass: 'font-malayalam',
    placeholder: 'ഞങ്ങളുടെ പ്രദേശത്ത് മൂന്ന് ദിവസമായി വെള്ളം വരുന്നില്ല...',
    greeting: 'നമസ്കാരം.',
    ui: {
      tapToSpeak: 'സംസാരിക്കാൻ ടാപ്പ് ചെയ്യുക',
      orTypeYourIssue: 'അല്ലെങ്കിൽ നിങ്ങളുടെ പ്രശ്നം ടൈപ്പ് ചെയ്യുക:',
      listeningMessage: '🎙️ കേൾക്കുന്നു... മലയാളത്തിൽ സംസാരിക്കുക',
      liveSpeechCaptured: '🎙️ തത്സമയ ശബ്ദം (Live Speech Captured)',
      tapToStop: 'നിർത്താൻ ടാപ്പ് ചെയ്യുക',
      aiAnalyzing: 'AI വിശകലനം ചെയ്യുന്നു...',
      convertingSpeech: '🎙️ സംഭാഷണം ടെക്സ്റ്റാക്കി മാറ്റുന്നു',
      extractingEntities: '🧠 വിവരങ്ങൾ എടുക്കുന്നു',
      validatingRules: '🛡️ നിയമങ്ങൾ പരിശോധിക്കുന്നു',
      weHeardYou: 'നിങ്ങളുടെ ശബ്ദം വ്യക്തമായി കേട്ടു.',
      capturedTranscript: 'പകർത്തിയ സംഭാഷണം (ആവശ്യമെങ്കിൽ എഡിറ്റ് ചെയ്യുക):',
      continueBtn: 'തുടരുക →',
      missingInfo: 'വിട്ടുപോയ വിവരങ്ങൾ',
      moreDetails: 'ശരിയായി വഴിതിരിച്ചുവിടാൻ കൂടുതൽ വിശദാംശങ്ങൾ ആവശ്യമാണ്.',
      provideDetails: 'വിശദാംശങ്ങൾ നൽകുക',
      looksGood: 'ശരിയാണ്. അടുത്തത് →',
      readyToSubmit: 'സമർപ്പിക്കാൻ തയ്യാർ',
      fileGrievance: 'ഔദ്യോഗിക പരാതി ഫയൽ ചെയ്യുക',
      success: 'വിജയം.',
      successMessage: 'പരാതി വിജയകരമായി രേഖപ്പെടുത്തി.',
      successMessageMulti: '{count} പരാതികൾ വിജയകരമായി രേഖപ്പെടുത്തി.',
      trackStatus: 'സ്ഥിതി ട്രാക്ക് ചെയ്യുക',
      fileAnother: 'മറ്റൊരു പരാതി',
      cancel: '✕ റദ്ദാക്കുക',
      howCanWeHelp: 'ഇന്ന് ഞങ്ങൾ നിങ്ങളെ എങ്ങനെ സഹായിക്കും?',
      skipQuestion: 'ഈ ചോദ്യം ഒഴിവാക്കുക',
    },
  },
  {
    code: 'te',
    bcp47: 'te-IN',
    name: 'తెలుగు',
    nameEn: 'Telugu',
    direction: 'ltr',
    fontClass: 'font-telugu',
    placeholder: 'మా ప్రాంతంలో మూడు రోజులుగా నీళ్ళు రావడం లేదు...',
    greeting: 'నమస్కారం.',
    ui: {
      tapToSpeak: 'మాట్లాడటానికి ట్యాప్ చేయండి',
      orTypeYourIssue: 'లేదా మీ సమస్యను టైప్ చేయండి:',
      listeningMessage: '🎙️ వింటోంది... తెలుగులో మాట్లాడండి',
      liveSpeechCaptured: '🎙️ ప్రత్యక్ష ప్రసంగం (Live Speech Captured)',
      tapToStop: 'ఆపడానికి ట్యాప్ చేయండి',
      aiAnalyzing: 'AI విశ్లేషిస్తోంది...',
      convertingSpeech: '🎙️ మాటను టెక్స్ట్‌గా మారుస్తోంది',
      extractingEntities: '🧠 సమాచారాన్ని సేకరిస్తోంది',
      validatingRules: '🛡️ నిబంధనలను తనిఖీ చేస్తోంది',
      weHeardYou: 'మీ మాట స్పష్టంగా వినబడింది.',
      capturedTranscript: 'రికార్డ్ చేసిన ప్రసంగం (అవసరమైతే సవరించండి):',
      continueBtn: 'కొనసాగించండి →',
      missingInfo: 'తప్పిపోయిన సమాచారం',
      moreDetails: 'సరైన మార్గంలో పంపడానికి మరికొన్ని వివరాలు అవసరం.',
      provideDetails: 'వివరాలు అందించండి',
      looksGood: 'సరిగ్గా ఉంది. తదుపరి →',
      readyToSubmit: 'సమర్పించడానికి సిద్ధం',
      fileGrievance: 'అధికారిక ఫిర్యాదు నమోదు చేయండి',
      success: 'విజయం.',
      successMessage: 'ఫిర్యాదు విజయవంతంగా నమోదు చేయబడింది.',
      successMessageMulti: '{count} ఫిర్యాదులు విజయవంతంగా నమోదు చేయబడ్డాయి.',
      trackStatus: 'స్థితిని ట్రాక్ చేయండి',
      fileAnother: 'మరో ఫిర్యాదు',
      cancel: '✕ రద్దు చేయండి',
      howCanWeHelp: 'ఈ రోజు మేము మీకు ఎలా సహాయం చేయగలం?',
      skipQuestion: 'ఈ ప్రశ్నను దాటవేయండి',
    },
  },
  {
    code: 'bn',
    bcp47: 'bn-IN',
    name: 'বাংলা',
    nameEn: 'Bengali',
    direction: 'ltr',
    fontClass: 'font-bengali',
    placeholder: 'আমাদের এলাকায় তিন দিন ধরে জল আসছে না...',
    greeting: 'নমস্কার.',
    ui: {
      tapToSpeak: 'কথা বলতে ট্যাপ করুন',
      orTypeYourIssue: 'অথবা আপনার সমস্যা টাইপ করুন:',
      listeningMessage: '🎙️ শুনছি... বাংলায় বলুন',
      liveSpeechCaptured: '🎙️ সরাসরি কথা (Live Speech Captured)',
      tapToStop: 'থামাতে ট্যাপ করুন',
      aiAnalyzing: 'AI বিশ্লেষণ করছে...',
      convertingSpeech: '🎙️ কথা থেকে লেখায় রূপান্তর করছে',
      extractingEntities: '🧠 তথ্য বের করছে',
      validatingRules: '🛡️ নিয়ম যাচাই করছে',
      weHeardYou: 'আপনার কথা স্পষ্টভাবে শোনা গেছে.',
      capturedTranscript: 'রেকর্ড করা কথা (প্রয়োজনে সম্পাদনা করুন):',
      continueBtn: 'এগিয়ে যান →',
      missingInfo: 'অসম্পূর্ণ তথ্য',
      moreDetails: 'সঠিকভাবে পাঠাতে আরো কিছু বিবরণ দরকার.',
      provideDetails: 'বিবরণ দিন',
      looksGood: 'ঠিক আছে. পরবর্তী →',
      readyToSubmit: 'জমা দিতে প্রস্তুত',
      fileGrievance: 'আনুষ্ঠানিক অভিযোগ দায়ের করুন',
      success: 'সফল.',
      successMessage: 'অভিযোগ সফলভাবে নথিভুক্ত করা হয়েছে.',
      successMessageMulti: '{count}টি অভিযোগ সফলভাবে নথিভুক্ত করা হয়েছে.',
      trackStatus: 'স্থিতি ট্র্যাক করুন',
      fileAnother: 'আরেকটি অভিযোগ',
      cancel: '✕ বাতিল',
      howCanWeHelp: 'আজ আমরা আপনাকে কিভাবে সাহায্য করতে পারি?',
      skipQuestion: 'এই প্রশ্ন এড়িয়ে যান',
    },
  },
  {
    code: 'ur',
    bcp47: 'ur-IN',
    name: 'اردو',
    nameEn: 'Urdu',
    direction: 'rtl',
    fontClass: 'font-urdu',
    placeholder: 'ہمارے علاقے میں تین دنوں سے پانی نہیں آ رہا...',
    greeting: 'السلام علیکم.',
    ui: {
      tapToSpeak: 'بولنے کے لیے ٹیپ کریں',
      orTypeYourIssue: 'یا اپنی شکایت ٹائپ کریں:',
      listeningMessage: '🎙️ سن رہے ہیں... اردو میں بولیں',
      liveSpeechCaptured: '🎙️ براہ راست تقریر (Live Speech Captured)',
      tapToStop: 'روکنے کے لیے ٹیپ کریں',
      aiAnalyzing: '...AI تجزیہ کر رہا ہے',
      convertingSpeech: '🎙️ تقریر کو متن میں تبدیل کر رہے ہیں',
      extractingEntities: '🧠 معلومات نکال رہے ہیں',
      validatingRules: '🛡️ قواعد کی جانچ کر رہے ہیں',
      weHeardYou: 'آپ کی بات واضح طور پر سنی گئی.',
      capturedTranscript: 'ریکارڈ شدہ تقریر (ضرورت ہو تو ترمیم کریں):',
      continueBtn: '← آگے بڑھیں',
      missingInfo: 'نامکمل معلومات',
      moreDetails: 'صحیح طریقے سے بھیجنے کے لیے مزید تفصیلات درکار ہیں.',
      provideDetails: 'تفصیلات فراہم کریں',
      looksGood: '← ٹھیک ہے۔ اگلا',
      readyToSubmit: 'جمع کرانے کے لیے تیار',
      fileGrievance: 'سرکاری شکایت درج کریں',
      success: 'کامیاب.',
      successMessage: 'شکایت کامیابی سے درج ہو گئی.',
      successMessageMulti: '{count} شکایات کامیابی سے درج ہو گئیں.',
      trackStatus: 'حیثیت ٹریک کریں',
      fileAnother: 'ایک اور شکایت',
      cancel: 'منسوخ ✕',
      howCanWeHelp: 'آج ہم آپ کی کیسے مدد کر سکتے ہیں؟',
      skipQuestion: 'یہ سوال چھوڑ دیں',
    },
  },
];

/** Get language config by code */
export function getLanguageByCode(code: string): LanguageConfig {
  return SUPPORTED_LANGUAGES.find(l => l.code === code) || SUPPORTED_LANGUAGES[0];
}

/** Get language config by BCP-47 code */
export function getLanguageByBcp47(bcp47: string): LanguageConfig {
  return SUPPORTED_LANGUAGES.find(l => l.bcp47 === bcp47) || SUPPORTED_LANGUAGES[0];
}

/** Default language */
export const DEFAULT_LANGUAGE = SUPPORTED_LANGUAGES[0]; // Tamil
