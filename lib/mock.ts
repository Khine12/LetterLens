/**
 * Demo mode: used ONLY when GEMINI_API_KEY is missing, so the UI can still be
 * clicked through. The real app always calls Gemini when a key is set.
 */
import type { DecodeResult } from "./types";

const RENT: DecodeResult = {
  letter_type: "3-Day Notice to Pay Rent or Quit",
  sender: "Sunrise Property Management (for the owner)",
  urgency: "high",
  urgency_reason: "You have only 3 business days to pay, or the landlord can start an eviction case in court.",
  summary_simple:
    "Your landlord says you did not pay October rent. You owe $1,850. You must pay within 3 business days, or move out. If you do neither, they can take you to court to evict you.",
  summary_translated:
    "အိမ်ရှင်က အောက်တိုဘာလ အိမ်လခ မပေးရသေးဘူးလို့ ပြောပါတယ်။ $1,850 ကို အလုပ်ရက် ၃ ရက်အတွင်း ပေးရပါမယ်။ မပေးနိုင်ရင် အိမ်ကနေ ထွက်ရပါမယ်။ နှစ်ခုလုံး မလုပ်ရင် တရားရုံးကို တင်ပြီး နှင်ထုတ်နိုင်ပါတယ်။",
  deadlines: [
    {
      date: "3 days after you got the notice (not counting weekends/holidays)",
      what: "Pay $1,850 or move out",
      source_quote: "WITHIN THREE (3) DAYS, excluding Saturdays, Sundays and judicial holidays",
    },
  ],
  money: [{ amount: "$1,850.00", what: "Rent for October 1–31, 2026", source_quote: "in the amount of $1,850.00" }],
  action_steps: [
    { step: "Count your 3 days today", how: "Start the day after you got the notice and skip Saturday, Sunday and court holidays." },
    { step: "Pay the exact amount, and get a receipt", how: "Pay at 300 S. Glendora Ave, Suite 210 (Mon–Fri 9–5) and ask for a signed, dated receipt." },
    { step: "If you cannot pay, get free legal help now", how: "Call 211 or Stay Housed L.A. before the 3 days end. Do not ignore court papers." },
  ],
  action_steps_translated: [
    "ဒီနေ့ပဲ ၃ ရက်ကို ရေတွက်ပါ — စာရတဲ့နေ့ရဲ့ နောက်တစ်ရက်ကစပြီး စနေ၊ တနင်္ဂနွေနဲ့ ရုံးပိတ်ရက် (judicial holidays) တွေကို မရေတွက်ပါနဲ့။",
    "ပမာဏအတိအကျ ပေးပြီး ပြေစာ (receipt) တောင်းပါ — 300 S. Glendora Ave, Suite 210 (တနင်္လာ–သောကြာ 9–5) မှာ ပေးပြီး လက်မှတ်ထိုး၊ ရက်စွဲပါတဲ့ ပြေစာ တောင်းပါ။",
    "မပေးနိုင်ရင် အခမဲ့ ဥပဒေအကူအညီ (legal aid) ချက်ချင်းရှာပါ — ၃ ရက် မပြည့်ခင် 211 ဒါမှမဟုတ် Stay Housed L.A. ကို ဖုန်းဆက်ပါ။ တရားရုံးစာ (court papers) ရောက်လာရင် လျစ်လျူမရှုပါနဲ့။",
  ],
  key_terms: [
    { term: "Pay Rent or Quit", meaning: "Pay what you owe, or leave the home." },
    { term: "Possession of the premises", meaning: "Living in and controlling the home." },
    { term: "Forfeiture of the rental agreement", meaning: "The landlord ends your lease." },
  ],
  scam_warning: { is_suspicious: false, reasons: [] },
  reply_draft:
    "Hello, my name is Mya Thida Aung in Unit 6 at 1420 E. Garvey Ave. I received the 3-day notice dated October 20 for $1,850. I will bring the full payment on [day]. Could you please give me a signed receipt? Thank you.",
  questions_to_ask: [
    "Can I pay by check or money order instead of in person?",
    "Is the $1,850 rent only, or does it include late fees?",
    "Will you give me a signed receipt?",
  ],
  not_stated: ["Whether late fees are included in $1,850", "Whether online payment is accepted"],
  translated: {
    letter_type: "အိမ်လခ ပေးဖို့ ဒါမှမဟုတ် အိမ်ကထွက်ဖို့ ၃ ရက် သတိပေးစာ (3-Day Notice)",
    urgency_reason: "အလုပ်ရက် ၃ ရက်ပဲ အချိန်ရပါတယ်။ မပေးရင် အိမ်ရှင်က နှင်ထုတ်ဖို့ (eviction) တရားရုံးမှာ စတင်တရားစွဲနိုင်ပါတယ်။",
    deadlines_what: ["$1,850 ပေးရမယ်၊ မပေးနိုင်ရင် အိမ်ကထွက်ရမယ်"],
    money_what: ["အောက်တိုဘာ 1–31, 2026 အတွက် အိမ်လခ"],
    key_terms_meaning: [
      "ကြွေးကျန်ကို ပေးပါ၊ မပေးရင် အိမ်ကနေ ထွက်ပါ လို့ ဆိုလိုတာပါ။",
      "အိမ်မှာ နေထိုင်ခွင့်နဲ့ အိမ်ကို ထိန်းထားခွင့်ပါ။",
      "အိမ်ရှင်က အိမ်ငှားစာချုပ်ကို ဖျက်လိုက်တာပါ။",
    ],
    scam_reasons: [],
    questions_to_ask: [
      "ကိုယ်တိုင် မလာဘဲ check ဒါမှမဟုတ် money order နဲ့ ပေးလို့ရမလား။",
      "$1,850 က အိမ်လခသက်သက်လား၊ နောက်ကျကြေး ပါသေးလား။",
      "လက်မှတ်ထိုးထားတဲ့ ပြေစာ (receipt) ပေးမှာလား။",
    ],
    not_stated: ["$1,850 ထဲမှာ နောက်ကျကြေး ပါမပါ မပြောထားပါဘူး။", "အွန်လိုင်းကနေ ပေးလို့ရမရ မပြောထားပါဘူး။"],
  },
};

const SCAM: DecodeResult = {
  letter_type: "Fake USPS delivery text (scam)",
  sender: "Pretends to be USPS (very likely fake)",
  urgency: "low",
  urgency_reason: "This is very likely a phishing scam. Just don't click the link.",
  summary_simple:
    "This text says USPS could not deliver a package and wants $1.99. The link is not a real USPS website. USPS does not text you asking for fees. Do not click or pay.",
  summary_translated:
    "ဒီစာက USPS က ပါဆယ် ပို့မရလို့ $1.99 ပေးပါလို့ ပြောပါတယ်။ လင့်ခ်က USPS ရဲ့ တကယ့်ဝက်ဘ်ဆိုက် မဟုတ်ပါ။ မနှိပ်ပါနဲ့၊ ငွေ မပေးပါနဲ့။",
  deadlines: [],
  money: [{ amount: "$1.99", what: "Fake 'redelivery fee'", source_quote: "A redelivery fee of $1.99 is required" }],
  action_steps: [
    { step: "Do not click the link", how: "The site steals card numbers; real USPS links end in usps.com." },
    { step: "Check tracking yourself", how: "Type usps.com into your browser and enter a tracking number from a real order." },
    { step: "Report and delete", how: "Forward the text to 7726 (SPAM), then delete it." },
  ],
  action_steps_translated: [
    "လင့်ခ်ကို မနှိပ်ပါနဲ့ — ဒီဆိုက်က ကတ်နံပါတ်တွေကို ခိုးပါတယ်။ တကယ့် USPS လင့်ခ်တွေက usps.com နဲ့ ဆုံးပါတယ်။",
    "ကိုယ်တိုင် စစ်ကြည့်ပါ — browser မှာ usps.com ကို ကိုယ်တိုင်ရိုက်ပြီး တကယ်မှာထားတဲ့ tracking နံပါတ်ကို ထည့်ကြည့်ပါ။",
    "တိုင်ကြားပြီး ဖျက်ပါ — စာကို 7726 (SPAM) ကို forward လုပ်ပြီး ဖျက်ပစ်ပါ။",
  ],
  key_terms: [
    { term: "Redelivery fee", meaning: "A fake charge. USPS redelivery is free." },
    { term: "Phishing", meaning: "A trick message that tries to steal your money or personal information." },
  ],
  scam_warning: {
    is_suspicious: true,
    reasons: [
      "Link is not usps.com",
      "Asks for a small fee to get your card number",
      "12-hour time pressure",
      "You did not request text alerts",
    ],
  },
  reply_draft: "",
  questions_to_ask: ["Am I actually expecting a USPS package?"],
  not_stated: ["Your name or the sender of the package"],
  translated: {
    letter_type: "USPS လို ဟန်ဆောင်ထားတဲ့ လိမ်လည်စာ (scam)",
    urgency_reason: "လိမ်လည်စာ ဖြစ်နိုင်ခြေ အရမ်းများပါတယ်။ လင့်ခ်ကို မနှိပ်ရင် ရပါပြီ။",
    deadlines_what: [],
    money_what: ["အတုအယောင် ပြန်ပို့ခ (redelivery fee)"],
    key_terms_meaning: [
      "အတုအယောင် ကြေးပါ။ USPS က ပြန်ပို့တာအတွက် ပိုက်ဆံမယူပါဘူး။",
      "ပိုက်ဆံ ဒါမှမဟုတ် ကိုယ်ရေးအချက်အလက် ခိုးဖို့ လှည့်စားတဲ့ မက်ဆေ့ခ်ျပါ။",
    ],
    scam_reasons: [
      "လင့်ခ်က usps.com မဟုတ်ပါဘူး",
      "ကတ်နံပါတ် ရဖို့ ပိုက်ဆံ နည်းနည်းလေး တောင်းထားပါတယ်",
      "၁၂ နာရီအတွင်း လုပ်ခိုင်းပြီး အလောတကြီး ဖိအားပေးထားပါတယ်",
      "စာတို အသိပေးချက် ကိုယ်တိုင် တောင်းထားတာ မဟုတ်ပါဘူး",
    ],
    questions_to_ask: ["USPS ပါဆယ် တစ်ခုခု တကယ် စောင့်နေတာ ရှိလား။"],
    not_stated: ["လက်ခံသူ နာမည်နဲ့ ပါဆယ်ပို့သူ နာမည် မပါပါဘူး။"],
  },
};

export function mockDecode(text: string): DecodeResult {
  const t = text.toLowerCase();
  if (t.includes("usps") || t.includes("redelivery")) return SCAM;
  if (t.includes("rent") || t.includes("quit")) return RENT;
  return {
    ...RENT,
    letter_type: "Demo mode (no API key)",
    sender: "—",
    urgency: "medium",
    urgency_reason: "Add GEMINI_API_KEY to .env.local to decode real letters.",
    summary_simple:
      "LetterLens is running in demo mode because no Gemini API key is set. Try the 'Rent notice' or 'Suspicious text' samples, or add a key to decode any letter.",
    summary_translated: "",
    translated: {},
  };
}
