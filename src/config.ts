export const SITE = {
  website: "https://pickleballstrats.com/",
  author: "Pickleball Strats",
  profile: "",
  desc: "Advanced pickleball strategy, techniques, and drills for competitive players looking to level up from 3.5 to 4.5+. Master doubles positioning, shot technique, and the mental game.",
  title: "Pickleball Strats",
  ogImage: "og-image.jpg",
  lightAndDarkMode: true,
  postPerIndex: 6,
  postPerPage: 10,
  scheduledPostMargin: 15 * 60 * 1000, // 15 minutes
  showArchives: true,
  showBackButton: true, // show back button in post detail
  editPost: {
    enabled: false,
    text: "Edit page",
    url: "",
  },
  dynamicOgImage: true,
  dir: "ltr", // "rtl" | "auto"
  lang: "en", // html lang code. Set this empty and default will be "en"
  timezone: "America/Chicago", // Default global timezone (IANA format)
} as const;
