
import { useState } from "react";
import {
  Bot,
  Send,
  UserRound,
  Headset,
  Sparkles,
  Building2,
  CheckCircle2,
  Wallet,
  UserPlus,
  Phone,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  RotateCcw,
  Home,
  IndianRupee,
  LoaderCircle,
  ArrowUpRight,
  BadgeCheck,
  Languages,
} from "lucide-react";
import { api, getApiErrorMessage } from "../services/api.js";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"
).replace(/\/+$/, "");

const COPY = {
  en: {
    title: "EstateMate AI",
    subtitle: "Your intelligent property companion",
    introTitle: "Find a place you'll love to call home.",
    introText:
      "Explore apartment options, understand your budget, and connect with our property team.",
    welcome:
      "Hello! Welcome to EstateMate. I can help you explore our 2 BHK and 3 BHK apartment options in Ahmedabad. What would you like to know?",
    placeholder: "Ask me anything about properties...",
    send: "Send",
    thinking: "Finding the right answer...",
    handoff: "Sales team follow-up",
    handoffAccepted:
      "The email server accepted the notification. This does not guarantee delivery to the recipient's inbox.",
    handoffFailed:
      "Your request was saved, but the email notification failed. Please contact the sales team if you need immediate assistance.",
    handoffPending:
      "Your request has been recorded for review. Email notification status is not confirmed.",
    disclaimer:
      "Property prices, availability, and project details must be confirmed by the sales team.",
    suggestions: [
      "Which apartment types are available?",
      "What is the overall price range?",
      "I want to arrange a site visit",
    ],
    error: "Unable to reach the assistant. Please try again.",
    retry: "Retry",
    recommendationTitle: "Find your property match",
    recommendationSubtitle:
      "Check your budget against the published price range.",
    explore: "Explore options",
    close: "Close",
    apartmentType: "Apartment type",
    budget: "Your budget",
    lakhs: "₹ lakh",
    budgetHint: "For example, enter 90 for ₹90 lakh.",
    findMatches: "Check my budget",
    findingMatches: "Checking budget...",
    resultTitle: "Your budget assessment",
    priceRange: "Published overall price range",
    salesConfirmation:
      "Specific projects, unit prices, and availability require sales-team confirmation. This assessment does not guarantee an available unit.",
    budgetError: "Enter a budget greater than 0 and no more than ₹10,000 lakh.",
    recommendationError: "Unable to check your budget. Please try again.",
    withinRange: "Within the overall price range",
    belowRange: "Below the overall price range",
    aboveRange: "Above the overall price range",
    projectNote: "An initial budget assessment, not a confirmed property listing.",
    discuss: "Discuss options with the sales team",
    leadTitle: "Request a callback",
    leadSubtitle:
      "Share your details so the sales team can follow up about your requirements.",
    leadName: "Full name",
    leadPhone: "Phone number",
    leadNamePlaceholder: "Enter your full name",
    leadPhonePlaceholder: "Enter your phone number",
    leadConsent:
      "I consent to receiving relevant property-related communications from the sales team. This is optional.",
    leadSubmit: "Submit enquiry",
    leadSubmitting: "Submitting enquiry...",
    leadSuccess: "Enquiry recorded",
    leadDuplicate: "Existing enquiry",
    leadDuplicateNote:
      "No new lead was created. Your existing record has been retained.",
    leadError: "Unable to submit your enquiry. Please try again.",
    leadReference: "Lead reference",
    leadRequired: "Please enter your name and phone number.",
    leadInvalidPhone: "Enter a valid phone number containing 7–15 digits.",
    leadSignIn:
      "Please sign in with an authorized account to submit this enquiry.",
    leadProjectNote:
      "Your enquiry records your general requirements. Specific project details and availability must be confirmed by the sales team.",
    secure: "Your information is handled through the existing enquiry API.",
    online: "Here to help",
    assistantLabel: "AI PROPERTY ASSISTANT",
    chatLabel: "Your conversation",
    quickActions: "QUICK QUESTIONS",
    budgetLabel: "BUDGET PLANNER",
    languageLabel: "Language",
  },

  hi: {
    title: "EstateMate AI",
    subtitle: "आपका स्मार्ट प्रॉपर्टी सहायक",
    introTitle: "अपने सपनों का घर खोजें।",
    introText:
      "अपार्टमेंट विकल्प जानें, बजट जाँचें और सेल्स टीम से जुड़ें।",
    welcome:
      "नमस्ते! EstateMate में आपका स्वागत है। मैं अहमदाबाद में 2 BHK और 3 BHK विकल्पों के बारे में जानकारी दे सकता हूँ। आप क्या जानना चाहते हैं?",
    placeholder: "प्रॉपर्टी के बारे में अपना सवाल लिखें...",
    send: "भेजें",
    thinking: "जवाब तैयार हो रहा है...",
    handoff: "सेल्स टीम से संपर्क",
    handoffAccepted:
      "ईमेल सर्वर ने सूचना स्वीकार की है। इससे इनबॉक्स में पहुँचने की गारंटी नहीं मिलती।",
    handoffFailed:
      "आपका अनुरोध सुरक्षित है, लेकिन ईमेल सूचना नहीं भेजी जा सकी।",
    handoffPending:
      "आपका अनुरोध समीक्षा के लिए दर्ज किया गया है। ईमेल की स्थिति की पुष्टि नहीं हुई है।",
    disclaimer: "कीमत और उपलब्धता की पुष्टि सेल्स टीम से करें।",
    suggestions: [
      "कौन से अपार्टमेंट उपलब्ध हैं?",
      "कीमत की सीमा क्या है?",
      "मैं साइट विज़िट करना चाहता हूँ",
    ],
    error: "सहायक से संपर्क नहीं हो पाया। दोबारा प्रयास करें।",
    retry: "फिर प्रयास करें",
    recommendationTitle: "अपने बजट के अनुसार घर खोजें",
    recommendationSubtitle: "प्रकाशित कीमत की सीमा में अपना बजट जाँचें।",
    explore: "विकल्प देखें",
    close: "बंद करें",
    apartmentType: "अपार्टमेंट का प्रकार",
    budget: "आपका बजट",
    lakhs: "₹ लाख",
    budgetHint: "₹90 लाख के लिए 90 दर्ज करें।",
    findMatches: "बजट जाँचें",
    findingMatches: "बजट जाँचा जा रहा है...",
    resultTitle: "आपके बजट का आकलन",
    priceRange: "प्रकाशित कुल कीमत की सीमा",
    salesConfirmation:
      "विशिष्ट प्रोजेक्ट, यूनिट की कीमत और उपलब्धता की पुष्टि सेल्स टीम करेगी।",
    budgetError: "0 से अधिक और ₹10,000 लाख तक का वैध बजट दर्ज करें।",
    recommendationError: "बजट जाँचने में समस्या हुई। दोबारा प्रयास करें।",
    withinRange: "कुल कीमत की सीमा के भीतर",
    belowRange: "कुल कीमत की सीमा से कम",
    aboveRange: "कुल कीमत की सीमा से अधिक",
    projectNote: "यह प्रारंभिक बजट आकलन है, उपलब्ध यूनिट की पुष्टि नहीं।",
    discuss: "सेल्स टीम से बात करें",
    leadTitle: "कॉलबैक का अनुरोध करें",
    leadSubtitle: "सेल्स टीम से संपर्क पाने के लिए अपनी जानकारी दें।",
    leadName: "पूरा नाम",
    leadPhone: "फ़ोन नंबर",
    leadNamePlaceholder: "अपना पूरा नाम दर्ज करें",
    leadPhonePlaceholder: "अपना फ़ोन नंबर दर्ज करें",
    leadConsent:
      "मैं प्रॉपर्टी से संबंधित जानकारी के लिए सेल्स टीम से संपर्क की सहमति देता/देती हूँ। यह वैकल्पिक है।",
    leadSubmit: "पूछताछ भेजें",
    leadSubmitting: "पूछताछ भेजी जा रही है...",
    leadSuccess: "पूछताछ दर्ज हो गई",
    leadDuplicate: "पहले से मौजूद पूछताछ",
    leadDuplicateNote: "नई लीड नहीं बनाई गई। मौजूदा रिकॉर्ड सुरक्षित है।",
    leadError: "पूछताछ भेजने में समस्या हुई। दोबारा प्रयास करें।",
    leadReference: "लीड संदर्भ",
    leadRequired: "अपना नाम और फ़ोन नंबर दर्ज करें।",
    leadInvalidPhone: "7–15 अंकों वाला मान्य फ़ोन नंबर दर्ज करें।",
    leadSignIn: "पूछताछ भेजने के लिए अधिकृत खाते से साइन इन करें।",
    leadProjectNote: "विशिष्ट प्रोजेक्ट और उपलब्धता की पुष्टि सेल्स टीम करेगी।",
    secure: "आपकी जानकारी मौजूदा पूछताछ API के माध्यम से भेजी जाती है।",
    online: "आपकी सहायता के लिए उपलब्ध",
    assistantLabel: "AI प्रॉपर्टी सहायक",
    chatLabel: "आपकी बातचीत",
    quickActions: "सुझाए गए सवाल",
    budgetLabel: "बजट प्लानर",
    languageLabel: "भाषा",
  },

  gu: {
    title: "EstateMate AI",
    subtitle: "તમારો સ્માર્ટ પ્રોપર્ટી સહાયક",
    introTitle: "તમારા સપનાનું ઘર શોધો.",
    introText:
      "એપાર્ટમેન્ટના વિકલ્પો જાણો, બજેટ તપાસો અને સેલ્સ ટીમનો સંપર્ક કરો.",
    welcome:
      "નમસ્તે! EstateMate માં આપનું સ્વાગત છે. હું અમદાવાદમાં 2 BHK અને 3 BHK વિકલ્પો વિશે મદદ કરી શકું છું. તમે શું જાણવા માંગો છો?",
    placeholder: "પ્રોપર્ટી વિશે તમારો પ્રશ્ન લખો...",
    send: "મોકલો",
    thinking: "જવાબ તૈયાર થઈ રહ્યો છે...",
    handoff: "સેલ્સ ટીમનો સંપર્ક",
    handoffAccepted:
      "ઇમેઇલ સર્વરે સૂચના સ્વીકારી છે, પરંતુ ઇનબૉક્સમાં પહોંચવાની ખાતરી નથી.",
    handoffFailed:
      "તમારી વિનંતી સાચવાઈ છે, પરંતુ ઇમેઇલ સૂચના મોકલી શકાઈ નથી.",
    handoffPending:
      "તમારી વિનંતી સમીક્ષા માટે નોંધાઈ છે. ઇમેઇલની સ્થિતિની પુષ્ટિ થઈ નથી.",
    disclaimer: "કિંમત અને ઉપલબ્ધતાની પુષ્ટિ સેલ્સ ટીમ પાસેથી કરો.",
    suggestions: [
      "કયા પ્રકારના એપાર્ટમેન્ટ ઉપલબ્ધ છે?",
      "કિંમતની મર્યાદા શું છે?",
      "મારે સાઇટ વિઝિટ ગોઠવવી છે",
    ],
    error: "સહાયક સાથે જોડાઈ શકાયું નથી. ફરી પ્રયાસ કરો.",
    retry: "ફરી પ્રયાસ કરો",
    recommendationTitle: "તમારા બજેટ મુજબ ઘર શોધો",
    recommendationSubtitle: "પ્રકાશિત કિંમતની મર્યાદા મુજબ બજેટ તપાસો.",
    explore: "વિકલ્પો જુઓ",
    close: "બંધ કરો",
    apartmentType: "એપાર્ટમેન્ટનો પ્રકાર",
    budget: "તમારું બજેટ",
    lakhs: "₹ લાખ",
    budgetHint: "₹90 લાખ માટે 90 દાખલ કરો.",
    findMatches: "બજેટ તપાસો",
    findingMatches: "બજેટ તપાસી રહ્યા છીએ...",
    resultTitle: "તમારા બજેટનું મૂલ્યાંકન",
    priceRange: "પ્રકાશિત કુલ કિંમતની મર્યાદા",
    salesConfirmation:
      "ચોક્કસ પ્રોજેક્ટ, યુનિટની કિંમત અને ઉપલબ્ધતાની પુષ્ટિ સેલ્સ ટીમ કરશે.",
    budgetError: "0 કરતાં વધુ અને ₹10,000 લાખ સુધીનું માન્ય બજેટ દાખલ કરો.",
    recommendationError: "બજેટ તપાસવામાં સમસ્યા આવી. ફરી પ્રયાસ કરો.",
    withinRange: "કુલ કિંમતની મર્યાદામાં",
    belowRange: "કુલ કિંમતની મર્યાદાથી ઓછું",
    aboveRange: "કુલ કિંમતની મર્યાદાથી વધુ",
    projectNote: "આ પ્રારંભિક બજેટ મૂલ્યાંકન છે, ઉપલબ્ધ યુનિટની પુષ્ટિ નથી.",
    discuss: "સેલ્સ ટીમ સાથે વાત કરો",
    leadTitle: "કૉલબૅકની વિનંતી કરો",
    leadSubtitle: "સેલ્સ ટીમ સંપર્ક કરી શકે તે માટે તમારી માહિતી આપો.",
    leadName: "પૂરું નામ",
    leadPhone: "ફોન નંબર",
    leadNamePlaceholder: "તમારું પૂરું નામ દાખલ કરો",
    leadPhonePlaceholder: "તમારો ફોન નંબર દાખલ કરો",
    leadConsent:
      "હું પ્રોપર્ટી સંબંધિત માહિતી માટે સેલ્સ ટીમ તરફથી સંપર્ક મેળવવા સંમતિ આપું છું. આ વૈકલ્પિક છે.",
    leadSubmit: "પૂછપરછ મોકલો",
    leadSubmitting: "પૂછપરછ મોકલાઈ રહી છે...",
    leadSuccess: "પૂછપરછ નોંધાઈ",
    leadDuplicate: "હાલની પૂછપરછ",
    leadDuplicateNote: "નવી લીડ બનાવાઈ નથી. હાલનો રેકોર્ડ સુરક્ષિત છે.",
    leadError: "પૂછપરછ મોકલી શકાયી નથી. ફરી પ્રયાસ કરો.",
    leadReference: "લીડ સંદર્ભ",
    leadRequired: "તમારું નામ અને ફોન નંબર દાખલ કરો.",
    leadInvalidPhone: "7–15 અંકનો માન્ય ફોન નંબર દાખલ કરો.",
    leadSignIn: "પૂછપરછ મોકલવા માટે અધિકૃત એકાઉન્ટથી સાઇન ઇન કરો.",
    leadProjectNote: "ચોક્કસ પ્રોજેક્ટ અને ઉપલબ્ધતાની પુષ્ટિ સેલ્સ ટીમ કરશે.",
    secure: "તમારી માહિતી હાલની પૂછપરછ API દ્વારા મોકલવામાં આવે છે.",
    online: "તમારી મદદ માટે ઉપલબ્ધ",
    assistantLabel: "AI પ્રોપર્ટી સહાયક",
    chatLabel: "તમારી વાતચીત",
    quickActions: "ઝડપી પ્રશ્નો",
    budgetLabel: "બજેટ પ્લાનર",
    languageLabel: "ભાષા",
  },
};

const formatLakhs = (amount) =>
  Number.isFinite(Number(amount))
    ? (Number(amount) / 100000).toLocaleString("en-IN", {
        maximumFractionDigits: 2,
      })
    : "—";

function SectionHeading({ icon: Icon, eyebrow, title, subtitle }) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100">
        <Icon size={21} />
      </div>
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">
            {eyebrow}
          </p>
        )}
        <h2 className="mt-0.5 text-base font-bold tracking-tight text-slate-900 sm:text-lg">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}

function Alert({ type = "error", children }) {
  const styles = {
    error: "border-rose-200 bg-rose-50 text-rose-800",
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
    info: "border-sky-200 bg-sky-50 text-sky-800",
  };

  return (
    <div
      role={type === "error" ? "alert" : "status"}
      className={`rounded-xl border px-4 py-3 text-sm leading-6 ${styles[type]}`}
    >
      {children}
    </div>
  );
}

export default function Assistant() {
  const [language, setLanguage] = useState("en");
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastFailedMessage, setLastFailedMessage] = useState("");

  const [handoffRequested, setHandoffRequested] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState(null);

  const [showRecommendations, setShowRecommendations] = useState(false);
  const [recommendationBhk, setRecommendationBhk] = useState("2 BHK");
  const [budgetLakhs, setBudgetLakhs] = useState("90");
  const [recommendation, setRecommendation] = useState(null);
  const [recommendationLoading, setRecommendationLoading] = useState(false);
  const [recommendationError, setRecommendationError] = useState("");

  const [showLeadForm, setShowLeadForm] = useState(false);
  const [buyer, setBuyer] = useState({
    name: "",
    phone: "",
    consent: false,
  });
  const [leadLoading, setLeadLoading] = useState(false);
  const [leadError, setLeadError] = useState("");
  const [leadResult, setLeadResult] = useState(null);

  const copy = COPY[language];

  async function sendMessage(text = message) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const history = messages.slice(-10).map(({ role, content }) => ({
      role,
      content,
    }));

    setMessages((current) => [
      ...current,
      { role: "user", content: trimmed },
    ]);
    setMessage("");
    setError("");
    setLastFailedMessage("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/assistant/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          language,
          history,
          consent: false,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string" ? data.detail : copy.error
        );
      }

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: data.reply || copy.error,
        },
      ]);

      if (
        data.handoff_required &&
        data.handoff_reason === "buyer_requested_human"
      ) {
        setHandoffRequested(true);
        setNotificationStatus(data.notification_status || "unknown");
      }
    } catch (err) {
      setError(err.message || copy.error);
      setLastFailedMessage(trimmed);
    } finally {
      setLoading(false);
    }
  }

  async function findRecommendations(event) {
    event.preventDefault();
    if (recommendationLoading) return;

    const budget = Number(budgetLakhs);

    if (!Number.isFinite(budget) || budget <= 0 || budget > 10000) {
      setRecommendationError(copy.budgetError);
      setRecommendation(null);
      return;
    }

    setRecommendationLoading(true);
    setRecommendationError("");
    setRecommendation(null);
    setLeadResult(null);
    setLeadError("");

    try {
      const response = await fetch(
        `${API_URL}/api/assistant/recommendations`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bhk: recommendationBhk,
            budget_inr: Math.round(budget * 100000),
            location: "Ahmedabad",
            amenities: [],
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : copy.recommendationError
        );
      }

      setRecommendation(data);
    } catch (err) {
      setRecommendationError(
        err.message || copy.recommendationError
      );
    } finally {
      setRecommendationLoading(false);
    }
  }

  async function submitBuyerLead(event) {
    event.preventDefault();

    if (!recommendation || leadLoading) return;

    setLeadError("");
    setLeadResult(null);

    const name = buyer.name.trim();
    const phone = buyer.phone.trim();
    const digits = phone.replace(/\D/g, "");

    if (name.length < 2 || !phone) {
      setLeadError(copy.leadRequired);
      return;
    }

    if (digits.length < 7 || digits.length > 15) {
      setLeadError(copy.leadInvalidPhone);
      return;
    }

    setLeadLoading(true);

    try {
      // This uses the existing authenticated leads API.
      // It intentionally does not bypass backend authentication.
      const response = await api.post("/api/leads", {
        name,
        phone,
        source: "Website",
        project: "General enquiry",
        bhk: recommendation.bhk,
        budget: recommendation.budget_inr,
        consent: buyer.consent,
      });

      const data = response.data;

      if (data.duplicate) {
        setLeadResult({
          type: "duplicate",
          message:
            data.message || "An enquiry with this phone number already exists.",
          lead: data.existing_lead || null,
        });
        return;
      }

      if (!data.lead) {
        throw new Error("The server did not confirm the enquiry.");
      }

      setLeadResult({
        type: "success",
        message: data.message || "Your enquiry has been recorded.",
        lead: data.lead,
      });

      setBuyer({ name: "", phone: "", consent: false });
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        setLeadError(copy.leadSignIn);
      } else {
        setLeadError(getApiErrorMessage(err) || copy.leadError);
      }
    } finally {
      setLeadLoading(false);
    }
  }

  function changeLanguage(nextLanguage) {
    setLanguage(nextLanguage);
    setMessages([]);
    setHandoffRequested(false);
    setNotificationStatus(null);
    setError("");
    setLastFailedMessage("");
    setRecommendationError("");
    setLeadError("");
    setRecommendation(null);
    setLeadResult(null);
  }

  function resetChat() {
    setMessages([]);
    setMessage("");
    setError("");
    setLastFailedMessage("");
    setHandoffRequested(false);
    setNotificationStatus(null);
  }

  const recommendationStatusLabel =
    recommendation?.recommendation_status === "within_overall_range"
      ? copy.withinRange
      : recommendation?.recommendation_status === "below_overall_range"
        ? copy.belowRange
        : recommendation?.recommendation_status === "above_overall_range"
          ? copy.aboveRange
          : null;

  const notificationMessage =
    notificationStatus === "accepted_by_smtp"
      ? copy.handoffAccepted
      : notificationStatus === "failed"
        ? copy.handoffFailed
        : copy.handoffPending;

  const notificationStyle =
    notificationStatus === "accepted_by_smtp"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : notificationStatus === "failed"
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <main className="min-h-screen bg-[#f4f7f4] px-3 py-4 text-slate-800 sm:px-6 sm:py-7 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Page heading */}
        <div className="mb-5 flex flex-col justify-between gap-4 sm:mb-7 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-800 text-white shadow-lg shadow-emerald-900/15">
              <Building2 size={25} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-800">
                ESTATEMATE · REAL ESTATE
              </p>
              <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
                {copy.title}
              </h1>
              <p className="mt-1 text-sm text-slate-500">{copy.subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <div className="hidden items-center gap-2 rounded-full border border-emerald-100 bg-white px-3 py-2 text-xs font-medium text-slate-600 sm:flex">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              {copy.online}
            </div>

            <div className="relative flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
              <Languages size={17} className="text-emerald-800" />
              <label htmlFor="assistant-language" className="sr-only">
                {copy.languageLabel}
              </label>
              <select
                id="assistant-language"
                value={language}
                onChange={(event) => changeLanguage(event.target.value)}
                className="max-w-[115px] cursor-pointer bg-transparent text-sm font-semibold outline-none"
              >
                <option value="en">English</option>
                <option value="hi">हिन्दी</option>
                <option value="gu">ગુજરાતી</option>
              </select>
            </div>
          </div>
        </div>

        {/* Hero banner */}
        <section className="relative mb-5 overflow-hidden rounded-3xl bg-gradient-to-br from-[#123f2b] via-[#176b45] to-[#238253] p-5 text-white shadow-xl shadow-emerald-950/10 sm:mb-7 sm:p-8 lg:p-9">
          <div className="pointer-events-none absolute -right-12 -top-16 h-64 w-64 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -right-2 -top-7 h-44 w-44 rounded-full border border-white/10" />

          <div className="relative grid items-center gap-6 lg:grid-cols-[1fr_auto]">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.17em] text-emerald-50">
                <Sparkles size={13} />
                AI-powered property discovery
              </span>

              <h2 className="mt-4 max-w-xl text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl lg:text-4xl">
                {copy.introTitle}
              </h2>

              <p className="mt-3 max-w-xl text-sm leading-6 text-emerald-50/85 sm:text-base sm:leading-7">
                {copy.introText}
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold">
                  <Home size={14} className="mr-1.5 inline" />
                  2 BHK & 3 BHK
                </span>
                <span className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold">
                  <IndianRupee size={14} className="mr-1 inline" />
                  Budget guidance
                </span>
                <span className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold">
                  <Headset size={14} className="mr-1.5 inline" />
                  Sales assistance
                </span>
              </div>
            </div>

            <div className="hidden h-36 w-36 items-center justify-center rounded-[2rem] border border-white/20 bg-white/10 shadow-inner lg:flex">
              <div className="flex h-24 w-24 items-center justify-center rounded-[1.6rem] bg-white text-emerald-800 shadow-xl">
                <Bot size={52} strokeWidth={1.5} />
              </div>
            </div>
          </div>
        </section>

        {/* Main layout */}
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)] lg:gap-7">
          {/* Conversation panel */}
          <section className="flex min-h-[620px] flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm lg:min-h-[740px]">
            <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800">
                  <Bot size={23} />
                  <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500" />
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-bold text-slate-900 sm:text-base">
                    {copy.chatLabel}
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {copy.assistantLabel}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={resetChat}
                title="Start a new conversation"
                aria-label="Start a new conversation"
                className="flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800"
              >
                <RotateCcw size={14} />
                <span className="hidden sm:inline">New chat</span>
              </button>
            </header>

            <div className="border-b border-emerald-50 bg-gradient-to-r from-emerald-50/80 to-white px-4 py-3 sm:px-6">
              <div className="flex items-start gap-2.5">
                <BadgeCheck size={17} className="mt-0.5 shrink-0 text-emerald-700" />
                <p className="text-xs leading-5 text-slate-600">
                  Ask questions, explore your budget, or request help from our
                  sales team. Project-specific details are confirmed by staff.
                </p>
              </div>
            </div>

            {/* Messages */}
            <div
              className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6"
              aria-live="polite"
              aria-label="Conversation messages"
            >
              {messages.length === 0 && (
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800">
                    <Bot size={19} />
                  </div>
                  <div className="max-w-[90%] rounded-2xl rounded-tl-md border border-slate-100 bg-slate-50 px-4 py-3.5 text-sm leading-7 text-slate-700 sm:max-w-[85%]">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-emerald-700">
                      EstateMate AI
                    </p>
                    {copy.welcome}
                  </div>
                </div>
              )}

              {messages.map((item, index) => (
                <div
                  key={`${index}-${item.role}`}
                  className={`flex items-end gap-2.5 ${
                    item.role === "user" ? "justify-end" : ""
                  }`}
                >
                  {item.role === "assistant" && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800">
                      <Bot size={17} />
                    </div>
                  )}

                  <div
                    className={`max-w-[88%] whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-sm leading-7 sm:max-w-[82%] ${
                      item.role === "user"
                        ? "rounded-br-md bg-emerald-800 text-white shadow-sm shadow-emerald-900/10"
                        : "rounded-bl-md border border-slate-100 bg-slate-50 text-slate-700"
                    }`}
                  >
                    {item.content}
                  </div>

                  {item.role === "user" && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                      <UserRound size={17} />
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex items-end gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800">
                    <Bot size={17} />
                  </div>
                  <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                    <LoaderCircle size={16} className="animate-spin text-emerald-700" />
                    {copy.thinking}
                  </div>
                </div>
              )}

              {error && (
                <Alert type="error">
                  <p>{error}</p>
                  <button
                    type="button"
                    onClick={() => sendMessage(lastFailedMessage)}
                    disabled={loading || !lastFailedMessage}
                    className="mt-2 inline-flex items-center gap-1.5 font-bold underline underline-offset-2 disabled:opacity-50"
                  >
                    <RotateCcw size={13} />
                    {copy.retry}
                  </button>
                </Alert>
              )}

              {handoffRequested && (
                <div className={`rounded-2xl border p-4 ${notificationStyle}`}>
                  <div className="flex items-start gap-3">
                    <Headset size={20} className="mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-bold">{copy.handoff}</p>
                      <p className="mt-1 text-xs leading-5">
                        {notificationMessage}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Suggested questions */}
            <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-4 sm:px-6">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                {copy.quickActions}
              </p>
              <div className="flex flex-wrap gap-2">
                {copy.suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    disabled={loading}
                    onClick={() => sendMessage(suggestion)}
                    className="rounded-full border border-emerald-100 bg-white px-3 py-2 text-left text-xs font-medium leading-5 text-emerald-900 transition hover:border-emerald-300 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>

            {/* Composer */}
            <form
              className="flex items-center gap-2 border-t border-slate-100 bg-white p-3 sm:gap-3 sm:p-4"
              onSubmit={(event) => {
                event.preventDefault();
                sendMessage();
              }}
            >
              <label htmlFor="assistant-message" className="sr-only">
                Your message
              </label>
              <input
                id="assistant-message"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder={copy.placeholder}
                maxLength={2000}
                disabled={loading}
                className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-700/10 disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={loading || !message.trim()}
                aria-label={copy.send}
                className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-800 px-4 py-3.5 text-sm font-bold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50 sm:px-5"
              >
                <Send size={17} />
                <span className="hidden sm:inline">{copy.send}</span>
              </button>
            </form>

            <p className="px-4 pb-4 text-center text-[10px] leading-5 text-slate-400 sm:px-6">
              {copy.disclaimer}
            </p>
          </section>

          {/* Property tools */}
          <aside className="space-y-5">
            <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
              <div className="p-5 sm:p-6">
                <SectionHeading
                  icon={Wallet}
                  eyebrow={copy.budgetLabel}
                  title={copy.recommendationTitle}
                  subtitle={copy.recommendationSubtitle}
                />

                <form onSubmit={findRecommendations} className="space-y-4">
                  <div>
                    <label
                      htmlFor="recommendation-bhk"
                      className="mb-2 block text-xs font-bold text-slate-700"
                    >
                      {copy.apartmentType}
                    </label>
                    <div className="relative">
                      <select
                        id="recommendation-bhk"
                        value={recommendationBhk}
                        onChange={(event) => {
                          setRecommendationBhk(event.target.value);
                          setRecommendation(null);
                          setRecommendationError("");
                          setLeadResult(null);
                          setLeadError("");
                        }}
                        disabled={recommendationLoading}
                        className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-700/10"
                      >
                        <option value="2 BHK">2 BHK</option>
                        <option value="3 BHK">3 BHK</option>
                      </select>
                      <ChevronDown
                        size={17}
                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="recommendation-budget"
                      className="mb-2 block text-xs font-bold text-slate-700"
                    >
                      {copy.budget} <span className="font-normal text-slate-400">({copy.lakhs})</span>
                    </label>
                    <div className="relative">
                      <IndianRupee
                        size={17}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <input
                        id="recommendation-budget"
                        type="number"
                        min="0.01"
                        max="10000"
                        step="0.01"
                        required
                        value={budgetLakhs}
                        onChange={(event) => {
                          setBudgetLakhs(event.target.value);
                          setRecommendation(null);
                          setRecommendationError("");
                          setLeadResult(null);
                          setLeadError("");
                        }}
                        disabled={recommendationLoading}
                        placeholder="90"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-9 pr-4 text-sm font-semibold outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-700/10"
                      />
                    </div>
                    <p className="mt-2 text-xs leading-5 text-slate-400">
                      {copy.budgetHint}
                    </p>
                  </div>

                  {recommendationError && (
                    <Alert type="error">{recommendationError}</Alert>
                  )}

                  <button
                    type="submit"
                    disabled={recommendationLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-800 px-4 py-3.5 text-sm font-bold text-white shadow-sm shadow-emerald-900/10 transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {recommendationLoading ? (
                      <LoaderCircle size={17} className="animate-spin" />
                    ) : (
                      <Sparkles size={17} />
                    )}
                    {recommendationLoading
                      ? copy.findingMatches
                      : copy.findMatches}
                    {!recommendationLoading && <ArrowUpRight size={16} />}
                  </button>
                </form>
              </div>

              {recommendation && (
                <div className="border-t border-slate-100 bg-slate-50/70 p-5 sm:p-6">
                  <div className="rounded-2xl border border-emerald-100 bg-white p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800">
                        <Building2 size={20} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-slate-900">
                          {copy.resultTitle}
                        </h3>
                        <p className="mt-1 text-xs text-slate-500">
                          {recommendation.bhk} · Budget ₹
                          {formatLakhs(recommendation.budget_inr)} lakh
                        </p>
                      </div>
                    </div>

                    {recommendationStatusLabel && (
                      <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-emerald-50 p-3">
                        <CheckCircle2
                          size={18}
                          className="mt-0.5 shrink-0 text-emerald-700"
                        />
                        <div>
                          <p className="text-sm font-bold text-emerald-900">
                            {recommendationStatusLabel}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-emerald-800/80">
                            {copy.projectNote}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
                        {copy.priceRange}
                      </p>
                      <p className="mt-2 text-xl font-extrabold tracking-tight text-emerald-800">
                        ₹{formatLakhs(recommendation.overall_price_minimum_inr)}
                        <span className="mx-1.5 text-sm font-medium text-slate-400">
                          –
                        </span>
                        ₹{formatLakhs(recommendation.overall_price_maximum_inr)}
                        <span className="ml-1 text-xs font-semibold text-slate-500">
                          lakh
                        </span>
                      </p>
                    </div>

                    {recommendation.message && (
                      <p className="mt-4 text-sm leading-6 text-slate-600">
                        {recommendation.message}
                      </p>
                    )}

                    <div className="mt-4 flex items-start gap-2">
                      <Headset
                        size={16}
                        className="mt-0.5 shrink-0 text-slate-400"
                      />
                      <p className="text-xs leading-5 text-slate-500">
                        {copy.salesConfirmation}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        sendMessage(
                          `I am interested in a ${recommendation.bhk} apartment with a budget of ₹${formatLakhs(recommendation.budget_inr)} lakh. Please help me understand the available options and connect me with the sales team for confirmation.`
                        )
                      }
                      disabled={loading}
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm font-bold text-emerald-800 transition hover:bg-emerald-50 disabled:opacity-50"
                    >
                      <MessageCircle size={16} />
                      {copy.discuss}
                    </button>
                  </div>

                  {/* Enquiry form */}
                  <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <button
                      type="button"
                      onClick={() => {
                        setShowLeadForm((current) => !current);
                        setLeadError("");
                      }}
                      aria-expanded={showLeadForm}
                      className="flex w-full items-center justify-between gap-3 p-4 text-left transition hover:bg-slate-50"
                    >
                      <span className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800">
                          <UserPlus size={19} />
                        </span>
                        <span>
                          <span className="block text-sm font-bold text-slate-900">
                            {copy.leadTitle}
                          </span>
                          <span className="mt-1 block text-xs text-slate-500">
                            {copy.leadSubtitle}
                          </span>
                        </span>
                      </span>
                      {showLeadForm ? (
                        <ChevronUp size={18} className="shrink-0 text-slate-400" />
                      ) : (
                        <ChevronDown size={18} className="shrink-0 text-slate-400" />
                      )}
                    </button>

                    {showLeadForm && (
                      <form
                        onSubmit={submitBuyerLead}
                        className="space-y-4 border-t border-slate-100 p-4"
                      >
                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-xs text-slate-500">
                            {copy.apartmentType}
                          </p>
                          <p className="mt-1 text-sm font-bold text-slate-800">
                            {recommendation.bhk}
                          </p>
                          <p className="mt-3 text-xs text-slate-500">
                            {copy.budget}
                          </p>
                          <p className="mt-1 text-sm font-bold text-emerald-800">
                            ₹{formatLakhs(recommendation.budget_inr)} lakh
                          </p>
                        </div>

                        <div>
                          <label
                            htmlFor="buyer-name"
                            className="mb-2 block text-xs font-bold text-slate-700"
                          >
                            {copy.leadName} *
                          </label>
                          <input
                            id="buyer-name"
                            name="name"
                            type="text"
                            required
                            minLength={2}
                            maxLength={100}
                            autoComplete="name"
                            value={buyer.name}
                            onChange={(event) => {
                              setBuyer((current) => ({
                                ...current,
                                name: event.target.value,
                              }));
                              setLeadError("");
                            }}
                            placeholder={copy.leadNamePlaceholder}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-700/10"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="buyer-phone"
                            className="mb-2 block text-xs font-bold text-slate-700"
                          >
                            {copy.leadPhone} *
                          </label>
                          <div className="relative">
                            <Phone
                              size={16}
                              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                            />
                            <input
                              id="buyer-phone"
                              name="phone"
                              type="tel"
                              inputMode="tel"
                              required
                              maxLength={25}
                              autoComplete="tel"
                              value={buyer.phone}
                              onChange={(event) => {
                                setBuyer((current) => ({
                                  ...current,
                                  phone: event.target.value,
                                }));
                                setLeadError("");
                              }}
                              placeholder={copy.leadPhonePlaceholder}
                              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-9 pr-3 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-700/10"
                            />
                          </div>
                        </div>

                        <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-3 transition hover:bg-slate-50">
                          <input
                            type="checkbox"
                            name="consent"
                            checked={buyer.consent}
                            onChange={(event) =>
                              setBuyer((current) => ({
                                ...current,
                                consent: event.target.checked,
                              }))
                            }
                            className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-800"
                          />
                          <span className="text-xs leading-5 text-slate-600">
                            {copy.leadConsent}
                          </span>
                        </label>

                        <div className="flex items-start gap-2 text-xs leading-5 text-slate-500">
                          <ShieldCheck
                            size={16}
                            className="mt-0.5 shrink-0 text-emerald-700"
                          />
                          <span>{copy.leadProjectNote}</span>
                        </div>

                        {leadError && <Alert type="error">{leadError}</Alert>}

                        {leadResult && (
                          <Alert
                            type={
                              leadResult.type === "success"
                                ? "success"
                                : "warning"
                            }
                          >
                            <p className="font-bold">
                              {leadResult.type === "success"
                                ? copy.leadSuccess
                                : copy.leadDuplicate}
                            </p>
                            <p className="mt-1">{leadResult.message}</p>
                            {leadResult.lead?.id != null && (
                              <p className="mt-2 text-xs">
                                {copy.leadReference}: {leadResult.lead.id}
                              </p>
                            )}
                            {leadResult.type === "duplicate" && (
                              <p className="mt-1 text-xs">
                                {copy.leadDuplicateNote}
                              </p>
                            )}
                          </Alert>
                        )}

                        <button
                          type="submit"
                          disabled={leadLoading}
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-800 px-4 py-3.5 text-sm font-bold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {leadLoading ? (
                            <LoaderCircle size={17} className="animate-spin" />
                          ) : (
                            <Send size={16} />
                          )}
                          {leadLoading
                            ? copy.leadSubmitting
                            : copy.leadSubmit}
                        </button>

                        <p className="text-center text-[10px] leading-5 text-slate-400">
                          {copy.secure}
                        </p>
                      </form>
                    )}
                  </div>
                </div>
              )}
            </section>

            {/* Trust and information card */}
            <section className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/70 p-5 shadow-sm sm:p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-800 shadow-sm ring-1 ring-emerald-100">
                  <ShieldCheck size={21} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Property information you can verify
                  </h3>
                  <p className="mt-2 text-xs leading-6 text-slate-600">
                    The assistant uses the available project information to
                    guide your search. Final prices, discounts, amenities,
                    possession details, and visit availability must be
                    confirmed by the sales team.
                  </p>
                </div>
              </div>
            </section>
          </aside>
        </div>

        <footer className="py-6 text-center text-[10px] leading-5 text-slate-400">
          EstateMate AI · Property discovery and buyer assistance
        </footer>
      </div>
    </main>
  );
}
