// Everything about KAI that isn't the catalogue. The catalogue (menu, branches,
// leagues) is generated into data.js from kaicoffeeco.com; this file holds what
// the app itself decides, and says so where it is a preview assumption.

export const BUSINESS = {
  name: "KAI",
  full: "KAI Coffee Co.",
  city: "Tehran",
  country: "Iran",
  tagline: "Your comfort zone",             // kaicoffeeco.com, the home page
  love: "From KAI with love",               // their posters
  instagram: "kaicoffeeco",
  instagramUrl: "https://www.instagram.com/kaicoffeeco",
  site: "kaicoffeeco.com",
  siteUrl: "https://kaicoffeeco.com",
  phone: "021 9101 0701",                   // "تماس مرکزی" on kaicoffeeco.com/branches
  phoneTel: "+982191010701",
  aboutEn: "KAI Coffee is a modern urban cafe and restaurant experience, designed around specialty drinks, fresh food, warm architecture, and refined everyday moments.",   // their /about, verbatim
  aboutFa: "کافه کای، تجربه ای مدرن از قهوه، غذا و فضای شهری است. جایی برای شروع روز، قرارهای کاری، لحظه های آرام و تجربه طعم هایی که با دقت و سلیقه طراحی شده اند.",
  currency: "T",
  currencyLong: "Toman",
};

export const LOYALTY = {
  // kaicoffeeco.com/kai-loyalty-program states the five leagues, the point
  // thresholds and the cashback percentages, but not how points accrue per
  // purchase. This rate is a PREVIEW ASSUMPTION so the ladder can be shown moving.
  pointsPerToman: 1 / 1000,     // 347,000 T latte → 347 points
  cashbackFloor: 1000,           // cashback credited in whole thousands
};

export const ORDER = {
  makeMinutes: 12,               // the countdown on the order screen
  maxPerLine: 9,
  keep: 30,                      // orders remembered on this device
};

export const CHECKIN = {
  holdMinutes: 60,               // one tap holds a seat for an hour, then lets go
  extendMinutes: 60,
  // Presence is device-local until an endpoint is set. Point this at a shared
  // room service and the same calls go there — see README → Check-in.
  endpoint: "",
  // Fills the rooms from a clock-derived roster so the feature can be judged on
  // one phone. Turn off the moment the endpoint above is live.
  demo: true,
};

export const STORAGE = "kai.v1.";
